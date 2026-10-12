import Phaser from 'phaser'
import { CONFIG, type MoodName } from '../config'
import { Synth } from '../audio'
import { SpritePool, TextPool } from '../pool'
import { buildTextures } from '../textures'
import { installInput } from '../input'
import { isDesktop, keyboardLocked, quitApp } from '../desktop'
import { currentMood, saveSettings, settings } from '../settings'
import { ModeSwitcher } from '../switcher'
import { MODES, findMode, type Mode } from '../modes'
import { playSmash, type SmashEvent, type ToyContext } from '../toys'

/**
 * The only scene. There is deliberately no menu, no level select, and no game
 * over — every one of those is a state a toddler can get stuck in and cannot
 * read their way out of. The game boots straight into play and stays there.
 *
 * Sub-games (`src/modes/`) and moods (`CONFIG.moods`) swap what happens inside
 * this scene; they never add a screen of their own.
 */
export class PlayScene extends Phaser.Scene {
  private synth = new Synth()
  private pool!: SpritePool
  private text!: TextPool
  private rng!: Phaser.Math.RandomDataGenerator
  private teardownInput?: () => void
  private parentPanel?: Phaser.GameObjects.Container
  private parentBody?: Phaser.GameObjects.Text
  private lockStatus = ''
  private mode: Mode = MODES[0]
  private leaveMode?: () => void
  private switcher!: ModeSwitcher

  constructor() {
    super('play')
  }

  create(): void {
    this.rng = new Phaser.Math.RandomDataGenerator([String(Date.now())])
    buildTextures(this)
    this.pool = new SpritePool(this)
    this.text = new TextPool(this)
    this.switcher = new ModeSwitcher(this, MODES)
    this.mode = findMode(settings.mode)

    this.drawHint()
    this.applyMood()

    this.teardownInput = installInput(this.game.canvas.parentElement ?? document.body, {
      onSmash: (e) => this.handleSmash(e),
      onParentEscape: () => this.toggleParentPanel(),
    })

    this.scale.on('resize', () => this.refresh())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.teardownInput?.()
      this.leaveMode?.()
    })
  }

  private handleSmash(e: SmashEvent): void {
    // Any input dismisses the hint text — the child has worked it out.
    this.hint?.setVisible(false)

    if (this.parentPanel?.visible) return

    if (e.source === 'pointer') {
      const picked = this.switcher.hit(e.x, e.y)
      if (picked) {
        this.setMode(picked)
        return
      }
    }

    playSmash(e, this.context(), this.mode.toys)
  }

  private context(): ToyContext {
    return {
      scene: this,
      pool: this.pool,
      text: this.text,
      synth: this.synth,
      rng: this.rng,
      width: this.scale.width,
      height: this.scale.height,
      color: (seed) => this.color(seed),
    }
  }

  private color(seed?: number): number {
    const p = currentMood().palette
    if (seed === undefined) return p[this.rng.between(0, p.length - 1)]
    return p[Math.abs(Math.floor(seed)) % p.length]
  }

  private setMode(mode: Mode): void {
    if (mode === this.mode) {
      this.switcher.wiggle(mode)
      return
    }
    this.mode = mode
    settings.mode = mode.name
    saveSettings()
    this.enterMode()
    this.layoutSwitcher()
    this.synth.chime()
  }

  private setMood(name: MoodName): void {
    settings.mood = name
    saveSettings()
    this.applyMood()
  }

  private applyMood(): void {
    const mood = currentMood()
    this.tweens.timeScale = mood.timeScale
    this.synth.setMood(mood.audio)
    this.hint?.setColor(mood.hintColor)
    this.refresh()
  }

  /** Rebuild everything that depends on screen size, mood or mode. */
  private refresh(): void {
    this.drawBackground()
    this.enterMode()
    this.layoutSwitcher()
  }

  private enterMode(): void {
    this.leaveMode?.()
    this.leaveMode = this.mode.enter?.(this.context())
  }

  private layoutSwitcher(): void {
    this.switcher.layout({
      width: this.scale.width,
      current: this.mode,
      visible: settings.childCanSwitch,
      night: currentMood().night,
      color: (i) => this.color(i),
    })
  }

  private bg?: Phaser.GameObjects.Graphics

  private drawBackground(): void {
    this.bg?.destroy()
    const { width, height } = this.scale
    const mood = currentMood()
    const g = this.add.graphics()
    g.fillGradientStyle(mood.background.top, mood.background.top, mood.background.bottom, mood.background.bottom, 1)
    g.fillRect(0, 0, width, height)

    if (mood.night) {
      // Seeded so the sky doesn't rearrange itself on every resize.
      const sky = new Phaser.Math.RandomDataGenerator(['stars'])
      for (let i = 0; i < 70; i++) {
        g.fillStyle(0xffffff, sky.realInRange(0.2, 0.7))
        g.fillCircle(sky.between(0, width), sky.between(0, height * 0.6), sky.realInRange(0.8, 2.2))
      }
      const r = Math.min(width, height) * 0.06
      const mx = width * 0.1
      const my = height * 0.15
      g.fillStyle(0xfff1c1, 0.95)
      g.fillCircle(mx, my, r)
      // The bite out of the moon is sky-coloured, so match the gradient there.
      const top = Phaser.Display.Color.ValueToColor(mood.background.top)
      const bottom = Phaser.Display.Color.ValueToColor(mood.background.bottom)
      const bite = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, height, my - r * 0.2)
      g.fillStyle(Phaser.Display.Color.GetColor(bite.r, bite.g, bite.b), 1)
      g.fillCircle(mx + r * 0.45, my - r * 0.2, r * 0.9)
    }

    g.setDepth(-1000)
    this.bg = g
  }

  private hint?: Phaser.GameObjects.Text

  private drawHint(): void {
    const { width, height } = this.scale
    this.hint = this.add
      .text(width / 2, height * 0.3, 'press anything', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '38px',
        color: currentMood().hintColor,
      })
      .setOrigin(0.5)
      .setDepth(-500)

    this.tweens.add({
      targets: this.hint,
      alpha: 0.35,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /**
   * The grown-up panel. Reached by holding Escape for three seconds, which is
   * well outside what random mashing produces. Picks the sub-game and mood,
   * and toggles the child's corner buttons.
   */
  private toggleParentPanel(): void {
    if (!this.parentPanel) this.buildParentPanel()
    else this.parentPanel.setVisible(!this.parentPanel.visible)

    if (!this.parentPanel?.visible) return
    this.parentPanel.setPosition(this.scale.width / 2, this.scale.height / 2)
    this.refreshParentBody()
    if (isDesktop) {
      void keyboardLocked().then((on) => {
        this.lockStatus = on
          ? 'Keyboard lock  ·  on'
          : navigator.userAgent.includes('Mac')
            ? 'Keyboard lock  ·  off: allow Toddler Smash in\nSystem Settings › Privacy & Security › Accessibility'
            : 'Keyboard lock  ·  off'
        this.refreshParentBody()
      })
    }
  }

  private buildParentPanel(): void {
    const { width, height } = this.scale
    const panel = this.add.container(width / 2, height / 2).setDepth(10_000)

    const bg = this.add.rectangle(0, 0, Math.min(640, width * 0.92), 400, 0x0d1018, 0.96)
    bg.setStrokeStyle(2, 0x39405c)

    const title = this.add
      .text(0, -160, 'Grown-up menu', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '26px',
        color: '#e8ecff',
      })
      .setOrigin(0.5)

    const body = this.add
      .text(0, 20, '', {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '17px',
        color: '#9aa3c4',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5)

    panel.add([bg, title, body])
    this.parentPanel = panel
    this.parentBody = body

    // Panel keys only work while it's open, so during play they're just
    // ordinary smashes.
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (!this.parentPanel?.visible) return
      if (this.handleParentKey(ev.key.toLowerCase())) this.refreshParentBody()
    })
  }

  private handleParentKey(key: string): boolean {
    const mode = MODES[Number(key) - 1]
    if (mode) {
      this.setMode(mode)
      return true
    }
    const mood = (Object.keys(CONFIG.moods) as MoodName[]).find((m) => CONFIG.moods[m].panelKey.toLowerCase() === key)
    if (mood) {
      this.setMood(mood)
      return true
    }
    if (key === 'c') {
      settings.childCanSwitch = !settings.childCanSwitch
      saveSettings()
      this.layoutSwitcher()
      return true
    }
    if (key === 'f' && !isDesktop) {
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
      else this.scale.startFullscreen()
      return true
    }
    if (key === 'q' && isDesktop) {
      quitApp()
      return true
    }
    return false
  }

  private refreshParentBody(): void {
    const mark = (on: boolean) => (on ? '●' : '○')
    const games = MODES.map((m, i) => `${mark(m === this.mode)} ${i + 1}  ${m.label}`).join('      ')
    const moods = (Object.keys(CONFIG.moods) as MoodName[])
      .map((name) => {
        const mood = CONFIG.moods[name]
        return `${mark(name === settings.mood)} ${mood.panelKey}  ${mood.label}`
      })
      .join('      ')

    const lines = [
      `Game      ${games}`,
      `Mood      ${moods}`,
      `${mark(settings.childCanSwitch)} C  Corner buttons let the child switch games`,
      '',
      isDesktop ? 'Q  Quit' : 'F  Fullscreen      ·      close the tab to quit',
    ]
    if (isDesktop && this.lockStatus) lines.push(this.lockStatus)
    lines.push('', 'Hold Escape again to hide this.')
    this.parentBody?.setText(lines.join('\n'))
  }
}
