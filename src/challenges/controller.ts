import Phaser from 'phaser'
import { CONFIG } from '../config'
import type { PlayAction } from '../input'
import type { Mode } from '../modes/types'
import { keyIndex, pianoKeyCount } from '../modes/pianoLayout'
import { safeAreaInsets } from '../safeArea'
import { currentMood } from '../settings'
import { playSmash, type SmashEvent, type ToyContext } from '../toys'
import type { StrokeEvent } from '../toys/types'
import { crossedNodes, challengeLayout, distanceToSegment, hit, moveNode, type BoardLayout, type Point } from './layout'
import { getPuzzle, type GameId, type Progression } from './model'

const SHAPES = ['circle', 'triangle', 'star'] as const

/** A bounded picture-only layer inside the existing scene. It never owns progress. */
export class ChallengeController {
  private graphics: Phaser.GameObjects.Graphics
  private timer: Phaser.Time.TimerEvent
  private cursor = 4
  private keyboard = false
  private control: 'back' | 'replay' | undefined
  private demoStarted = -Infinity
  private demoIndex = -1
  private paused = false
  private lastFeedback = -Infinity
  private lastPlant = -Infinity
  private lastToy = -Infinity
  private pulse?: { point: Point; at: number }
  private garden: Point[] = []
  private pointers = new Map<number, Point>()
  private multiTouch = false
  private board: BoardLayout

  constructor(
    private progress: Progression,
    private game: GameId,
    private ctx: () => ToyContext,
    private mode: Mode,
  ) {
    const context = this.ctx()
    this.board = challengeLayout(context.width, context.height, this.game, safeAreaInsets())
    this.graphics = context.scene.add.graphics().setDepth(100)
    this.timer = context.scene.time.addEvent({ delay: 80, loop: true, callback: () => {
      try { this.draw() } catch { /* A discovery must never stop ordinary play. */ }
    } })
    this.roundChanged()
  }

  private get state() { return this.progress.state(this.game) }
  private get puzzle() { return getPuzzle(this.game, this.state.solved) }
  private get layout() { return this.board }

  pause(paused: boolean): void {
    this.paused = paused
    this.graphics.setVisible(!paused)
    this.pointers.clear()
    this.multiTouch = false
    if (paused) this.demoStarted = -Infinity
    else this.draw()
  }

  destroy(): void {
    this.timer.remove()
    this.graphics.destroy()
    this.mode.setPlayground?.(false, this.ctx())
  }

  /** True means a picture control supplied the feedback, rather than a normal toy. */
  action({ event: e, key }: PlayAction): boolean {
    if (this.paused) return false
    if (key === 'Backspace' && this.state.view !== 'free') {
      this.back()
      return true
    }
    if (key === 'Tab' && this.state.view !== 'free') {
      this.keyboard = true
      this.control = this.control === undefined ? 'back' : this.control === 'back' ? 'replay' : undefined
      this.feedback(this.control ? this.layout[this.control] : this.cursorPoint())
      this.draw()
      return true
    }
    if (key?.startsWith('Arrow')) {
      this.keyboard = true
      if (this.control) {
        if (key === 'ArrowDown') this.control = undefined
        else if (key === 'ArrowLeft') this.control = 'back'
        else if (key === 'ArrowRight') this.control = 'replay'
      } else if (this.state.view !== 'free' && (
        (key === 'ArrowUp' && this.cursor < 3) || (key === 'ArrowDown' && this.cursor >= 6) ||
        (key === 'ArrowLeft' && this.cursor % 3 === 0) || (key === 'ArrowRight' && this.cursor % 3 === 2)
      )) {
        this.control = key === 'ArrowRight' ? 'replay' : 'back'
      } else {
        const next = moveNode(this.cursor, key)
        if (this.game === 'drawing' && this.state.view !== 'free') {
          this.demoStarted = -Infinity
          if (this.state.view === 'puzzle' && this.state.attempt === 0) this.answer(this.cursor)
          const from = this.layout.nodes[this.cursor]
          const to = this.layout.nodes[next]
          if (next !== this.cursor) {
            this.mode.paintSegment?.(from, to, this.ctx())
            this.cursor = next
            if (this.state.view === 'puzzle') this.answer(next)
          }
        } else this.cursor = next
      }
      this.feedback(this.control ? this.layout[this.control] : this.cursorPoint())
      this.draw()
      return true
    }
    if (key === ' ' || key === 'Enter') {
      this.keyboard = true
      if (this.control) {
        if (this.control === 'back') this.back()
        else this.replay()
        return true
      }
      return this.select(this.cursorPoint(), e, true)
    }
    if (e.source === 'pointer') {
      this.keyboard = false
      this.control = undefined
      return this.select(e, e, false)
    }
    if (this.state.view === 'free') this.progress.follow(this.game, false)
    else if (this.state.view === 'puzzle') {
      this.demoStarted = -Infinity
      if (this.game === 'piano') {
        const n = pianoKeyCount(this.ctx().width)
        this.answer(this.noteSymbols(n).indexOf(keyIndex(e, this.ctx().width, n)))
      } else this.progress.resetAttempt(this.game)
    } else if (this.game === 'smash') this.plant(e)
    this.draw()
    return false
  }

  stroke(e: StrokeEvent): void {
    if (e.phase === 'end') {
      this.pointers.delete(e.pointerId)
      if (this.pointers.size === 0) this.multiTouch = false
      return
    }
    if (this.paused || this.state.view !== 'puzzle' || this.game !== 'drawing') return
    const before = this.pointers.get(e.pointerId)
    this.pointers.set(e.pointerId, e)
    if (!before || this.multiTouch) return
    // A broad corridor tolerates young hands, but an excursion cannot skip a corner.
    const { nodes, radius } = this.layout
    const oldRound = this.state.solved
    for (const node of crossedNodes(before, e, nodes, radius)) {
      this.answer(node)
      if (this.state.solved !== oldRound) break
    }
    if (this.state.solved === oldRound && this.state.attempt > 0) {
      const i = this.state.attempt - 1
      const route = this.puzzle.answer
      if (distanceToSegment(e, nodes[route[i]], nodes[route[Math.min(i + 1, route.length - 1)]]) > radius * 1.8) {
        this.progress.resetAttempt(this.game)
      }
    }
    this.draw()
  }

  private select(point: Point, e: SmashEvent, virtual: boolean): boolean {
    const layout = this.layout
    if (this.state.view !== 'free') {
      if (hit(point, layout.back, 32)) { this.back(); return true }
      if (hit(point, layout.replay, 32)) { this.replay(); return true }
    }
    if (this.state.view === 'free') {
      const target = layout.perches[this.state.discovered ? 0 : this.state.entranceStep]
      const found = hit(point, target, layout.radius * 1.25)
      this.progress.follow(this.game, found)
      if (found) {
        this.feedback(point)
        if (this.state.view !== 'free') {
          this.ctx().pool.clear()
          this.ctx().text.clear()
          this.roundChanged()
        }
      }
      else if (virtual) this.feedback(point)
      this.draw()
      return found || virtual
    }
    this.demoStarted = -Infinity
    if (this.state.view === 'playground') {
      if (this.game === 'smash') this.plant(point)
      if (virtual) this.playAt(point, e)
      this.draw()
      return virtual
    }
    if (this.game === 'smash') {
      const i = layout.choices.findIndex((p) => hit(point, p, layout.radius * 1.3))
      this.answer(i)
      this.feedback(point)
      return true
    }
    if (this.game === 'piano') {
      const n = pianoKeyCount(this.ctx().width)
      const note = keyIndex({ ...e, x: point.x }, this.ctx().width, n)
      this.answer(this.noteSymbols(n).indexOf(note))
      if (virtual) this.playAt(point, e)
      this.draw()
      return virtual
    }
    // One moving finger owns an attempt; separate taps can visit adjacent dots.
    if (!virtual) {
      this.pointers.set(e.pointerId ?? -1, point)
      if (this.pointers.size > 1) {
        this.multiTouch = true
        this.progress.resetAttempt(this.game)
      }
    }
    if (!this.multiTouch) {
      const i = layout.nodes.findIndex((p) => hit(point, p, layout.radius))
      this.answer(i)
    }
    this.draw()
    return virtual
  }

  private noteSymbols(n: number): number[] { return [0, Math.floor((n - 1) / 2), n - 1] }

  private cursorPoint(): Point {
    if (this.game === 'piano' && this.state.view !== 'free') {
      const ctx = this.ctx(), n = pianoKeyCount(ctx.width)
      return { x: (this.noteSymbols(n)[this.cursor % 3] + 0.5) * ctx.width / n, y: ctx.height * 0.75 }
    }
    return this.layout.nodes[this.cursor]
  }

  private answer(value: number): void {
    const result = this.progress.answer(this.game, value)
    if (result === 'wrong' && this.game === 'drawing') this.cursor = this.puzzle.answer[0]
    if (result === 'correct') this.feedback(this.game === 'drawing' ? this.layout.nodes[value] : this.layout.choices[value])
    if (result === 'round' || result === 'unlock') {
      this.feedback(this.layout.nodes[4])
      this.roundChanged()
    }
    this.draw()
  }

  private roundChanged(): void {
    this.cursor = this.game === 'drawing' && this.state.view === 'puzzle' ? this.puzzle.answer[0] : 4
    this.control = undefined
    this.pointers.clear()
    this.multiTouch = false
    this.mode.setPlayground?.(this.state.view === 'playground', this.ctx())
    this.replay()
  }

  private replay(): void {
    if (this.state.view !== 'free') this.feedback(this.layout.replay)
    if (this.state.view === 'puzzle') {
      this.progress.resetAttempt(this.game)
      this.cursor = this.game === 'drawing' ? this.puzzle.answer[0] : 4
      this.demoStarted = this.ctx().scene.time.now
      this.demoIndex = -1
    }
    this.draw()
  }

  private back(): void {
    this.feedback(this.layout.back)
    this.progress.back(this.game)
    this.mode.setPlayground?.(false, this.ctx())
    this.garden = []
    this.cursor = 4
    this.control = undefined
    this.pointers.clear()
    this.draw()
  }

  private feedback(point: Point | undefined): void {
    if (!point) return
    const now = this.ctx().scene.time.now
    this.pulse = { point, at: now }
    if (now - this.lastFeedback < CONFIG.challenges.feedbackIntervalMs) return
    this.lastFeedback = now
    this.ctx().synth.play(this.state.solved + this.state.attempt)
  }

  private playAt(point: Point, e: SmashEvent): void {
    const ctx = this.ctx()
    if (ctx.scene.time.now - this.lastToy < currentMood().minSpawnIntervalMs) return
    this.lastToy = ctx.scene.time.now
    playSmash({ ...e, ...point, char: '', isLetter: false, isDigit: false, source: 'pointer' }, ctx, this.mode.toys)
  }

  private plant(point: Point): void {
    const now = this.ctx().scene.time.now
    if (now - this.lastPlant < currentMood().minSpawnIntervalMs) return
    this.lastPlant = now
    this.garden.push({ x: point.x, y: point.y })
    if (this.garden.length > CONFIG.challenges.maxGardenStars) this.garden.shift()
    const ctx = this.ctx()
    ctx.synth.play(this.garden.length)
    const star = ctx.pool.spawn('star', point.x, point.y).setScale(0.35).setTint(ctx.color(this.garden.length))
    ctx.pool.retire(star, 200, 500)
  }

  private draw(): void {
    if (this.paused) return
    const ctx = this.ctx(), g = this.graphics, l = this.layout
    const state = this.state, night = currentMood().night
    const ink = night ? 0xd9dcff : 0x536385
    const paper = night ? 0x1d2447 : 0xffffff
    const now = ctx.scene.time.now
    g.clear()
    ctx.scene.game.canvas.setAttribute('aria-label', `Toddler Smash. ${this.game}. ${state.view}. ${state.solved} puzzles solved.`)
    if (state.view === 'free') {
      const p = l.perches[state.discovered ? 0 : state.entranceStep]
      if (state.entranceStep > 0) {
        g.lineStyle(2, ink, 0.16)
        g.lineBetween(l.perches[state.entranceStep - 1].x, l.perches[state.entranceStep - 1].y, p.x, p.y)
      }
      this.firefly(p, 0.82 + Math.sin(now / 650) * 0.13, state.discovered)
    } else {
      this.button(l.back, 'back', ink, paper)
      this.button(l.replay, state.view === 'playground' ? 'star' : 'replay', ink, paper)
      // Three flowers disclose depth without scores or level numbers.
      for (let i = 0; i < 3; i++) {
        const p = { x: ctx.width / 2 + (i - 1) * 32, y: l.back.y }
        this.shape(2, p, 10, i <= Math.floor(state.solved / 2) ? ctx.color(i * 2) : ink, i <= Math.floor(state.solved / 2) ? 0.9 : 0.2)
      }
      if (state.view === 'playground') {
        for (let i = 0; i < this.garden.length; i++) {
          const p = this.garden[i]
          if (i > 0) { g.lineStyle(3, ctx.color(i), 0.5); g.lineBetween(this.garden[i - 1].x, this.garden[i - 1].y, p.x, p.y) }
          this.shape(2, p, 14, ctx.color(i), 0.85)
        }
        if (this.game !== 'smash') this.shape(this.game === 'piano' ? 0 : 2, { x: ctx.width / 2, y: l.promptY }, 28, ctx.color(3), 0.45)
      } else {
        const puzzle = this.puzzle
        const stepMs = CONFIG.challenges.demoStepMs / currentMood().timeScale
        const demo = Math.floor((now - this.demoStarted) / stepMs)
        const showing = demo >= 0 && demo < puzzle.prompt.length
        if (showing && demo !== this.demoIndex) {
          this.demoIndex = demo
          const value = puzzle.prompt[demo]
          if (this.game === 'piano') this.mode.replayNote?.(this.noteSymbols(pianoKeyCount(ctx.width))[value], ctx)
          else ctx.synth.play(value, 'blip', 0.5)
        }
        if (this.game === 'drawing') {
          g.lineStyle(8, ink, 0.13)
          for (let i = 1; i < puzzle.prompt.length; i++) {
            const a = l.nodes[puzzle.prompt[i - 1]], b = l.nodes[puzzle.prompt[i]]
            g.lineBetween(a.x, a.y, b.x, b.y)
          }
          for (let i = 0; i < 9; i++) {
            const p = l.nodes[i], onRoute = puzzle.prompt.includes(i)
            g.fillStyle(paper, 0.8); g.fillCircle(p.x, p.y, l.radius * 0.75)
            g.lineStyle(3, onRoute ? ctx.color(3) : ink, onRoute ? 0.65 : 0.18)
            g.strokeCircle(p.x, p.y, l.radius * 0.75)
            if (i === puzzle.answer[0]) this.shape(2, p, 13, ctx.color(1), 0.9)
            if (showing && puzzle.prompt[demo] === i) { g.fillStyle(ctx.color(3), 0.5); g.fillCircle(p.x, p.y, l.radius) }
          }
          for (let i = 1; i < state.attempt; i++) {
            const a = l.nodes[puzzle.answer[i - 1]], b = l.nodes[puzzle.answer[i]]
            g.lineStyle(7, ctx.color(3), 0.8); g.lineBetween(a.x, a.y, b.x, b.y)
          }
        } else {
          if (puzzle.kind === 'match') this.shape(puzzle.prompt[0], { x: ctx.width / 2, y: l.promptY }, 30, ink, 0.35)
          else {
            const spacing = Math.min(50, (ctx.width - 130) / (puzzle.prompt.length + (puzzle.kind === 'pattern' ? 2 : 0)))
            const total = puzzle.prompt.length + (puzzle.kind === 'pattern' ? 2 : 0)
            for (let i = 0; i < total; i++) {
              const p = { x: ctx.width / 2 + (i - (total - 1) / 2) * spacing, y: l.promptY }
              if (puzzle.kind === 'pattern' && i < puzzle.prompt.length) this.shape(puzzle.prompt[i], p, 15, ctx.color(puzzle.prompt[i] * 2), 0.8)
              else if (puzzle.kind === 'pattern' && i - puzzle.prompt.length < state.attempt) {
                const value = puzzle.answer[i - puzzle.prompt.length]
                this.shape(value, p, 15, ctx.color(value * 2), 0.95)
              }
              else if (puzzle.kind !== 'pattern' && i < state.attempt) {
                const value = puzzle.answer[i]
                const colorIndex = this.game === 'piano' ? this.noteSymbols(pianoKeyCount(ctx.width))[value] : value * 2
                this.shape(this.game === 'piano' ? 0 : value, p, 17, ctx.color(colorIndex), 0.8)
              }
              else if (showing && demo === i) {
                const colorIndex = this.game === 'piano' ? this.noteSymbols(pianoKeyCount(ctx.width))[puzzle.prompt[i]] : puzzle.prompt[i] * 2
                this.shape(this.game === 'piano' ? 0 : puzzle.prompt[i], p, 20, ctx.color(colorIndex), 1)
              }
              else { g.lineStyle(2, ink, 0.22); g.strokeCircle(p.x, p.y, 12) }
            }
          }
          if (this.game === 'smash') for (let i = 0; i < 3; i++) {
            const p = l.choices[i]
            g.fillStyle(paper, 0.8); g.fillCircle(p.x, p.y, l.radius * 1.35)
            this.shape(i, p, l.radius * 0.8, ctx.color(i * 2), 0.95)
          }
          else {
            const n = pianoKeyCount(ctx.width)
            const keys = this.noteSymbols(n)
            for (let i = 0; i < 3; i++) {
              const p = { x: (keys[i] + 0.5) * ctx.width / n, y: ctx.height * 0.61 }
              this.shape(2, p, 12, paper, showing && puzzle.prompt[demo] === i ? 1 : 0.48)
            }
          }
        }
        for (let i = 0; i < puzzle.answer.length; i++) {
          g.fillStyle(i < state.attempt ? ctx.color(3) : ink, i < state.attempt ? 0.95 : 0.15)
          g.fillCircle(ctx.width / 2 + (i - (puzzle.answer.length - 1) / 2) * 16, l.replay.y + 37, 4)
        }
      }
    }
    if (this.keyboard) {
      const p = this.control ? l[this.control] : this.cursorPoint()
      g.lineStyle(3, night ? 0xb8e9ee : 0x277da1, 0.85)
      g.strokeCircle(p.x, p.y, l.radius + 8)
      g.fillStyle(ink, 0.85); g.fillCircle(p.x, p.y, 4)
    }
    if (this.pulse && now - this.pulse.at < 550) {
      const t = (now - this.pulse.at) / 550
      g.lineStyle(3, ctx.color(3), 1 - t)
      g.strokeCircle(this.pulse.point.x, this.pulse.point.y, 16 + t * 45)
    }
  }

  private button(p: Point, icon: 'back' | 'replay' | 'star', ink: number, paper: number): void {
    const g = this.graphics
    g.fillStyle(paper, 0.85); g.fillCircle(p.x, p.y, 28)
    g.lineStyle(4, ink, 0.8)
    if (icon === 'back') {
      g.lineBetween(p.x + 12, p.y, p.x - 12, p.y)
      g.lineBetween(p.x - 12, p.y, p.x - 2, p.y - 10)
      g.lineBetween(p.x - 12, p.y, p.x - 2, p.y + 10)
    } else if (icon === 'replay') {
      g.beginPath(); g.arc(p.x, p.y, 12, Math.PI * 0.2, Math.PI * 1.8); g.strokePath()
      g.lineBetween(p.x + 10, p.y - 8, p.x + 2, p.y - 11)
      g.lineBetween(p.x + 10, p.y - 8, p.x + 10, p.y - 17)
    } else this.shape(2, p, 14, ink, 0.8)
  }

  private firefly(p: Point, alpha: number, open: boolean): void {
    const g = this.graphics, ctx = this.ctx()
    if (open) {
      g.lineStyle(4, ctx.color(3), 0.4)
      g.strokeRoundedRect(p.x - 25, p.y - 34, 50, 68, 24)
    }
    g.fillStyle(ctx.color(2), alpha * 0.12); g.fillCircle(p.x, p.y, 35)
    g.fillStyle(currentMood().night ? 0xb8b5ff : 0x84a6cd, alpha * 0.55)
    g.fillEllipse(p.x - 13, p.y - 9, 23, 16); g.fillEllipse(p.x + 13, p.y - 9, 23, 16)
    g.fillStyle(ctx.color(2), alpha); g.fillEllipse(p.x, p.y + 5, 24, 30)
    g.fillStyle(0xffffff, alpha); g.fillCircle(p.x - 5, p.y - 4, 5); g.fillCircle(p.x + 5, p.y - 4, 5)
    g.fillStyle(0x35415c, alpha); g.fillCircle(p.x - 4, p.y - 4, 2); g.fillCircle(p.x + 4, p.y - 4, 2)
  }

  private shape(value: number, p: Point, r: number, color: number, alpha: number): void {
    const g = this.graphics
    g.fillStyle(color, alpha)
    if (SHAPES[value] === 'circle') g.fillCircle(p.x, p.y, r)
    else if (SHAPES[value] === 'triangle') g.fillTriangle(p.x, p.y - r, p.x + r, p.y + r, p.x - r, p.y + r)
    else {
      const points = Array.from({ length: 10 }, (_, i) => {
        const a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? r * 0.45 : r
        return new Phaser.Math.Vector2(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)
      })
      g.fillPoints(points, true)
    }
  }
}
