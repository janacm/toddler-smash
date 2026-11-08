import Phaser from 'phaser'
import { CONFIG } from '../config'
import type { ToyContext } from '../toys/types'
import { currentMood } from '../settings'
import {
  checkThoughtMatch,
  pickNextThoughtTarget,
  SHAPES_LIST,
  type ThoughtMatchEvent,
  type ThoughtTarget,
} from './thoughtBubbleLogic'

/**
 * Visual companion in the top-left corner with pictorial thought-bubble requests.
 * Completely non-punitive: ignoring it has zero negative consequences.
 * Matching triggers a celebratory backflip, eats the icon, and showers pooled sparkles.
 */
export class ThoughtCompanion {
  private container: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Image
  private trailDot1: Phaser.GameObjects.Image
  private trailDot2: Phaser.GameObjects.Image
  private bubble: Phaser.GameObjects.Image
  private icon: Phaser.GameObjects.Image
  private target: ThoughtTarget | null = null
  private gameMode: 'smash' | 'piano' | 'drawing' = 'smash'
  private autoCycleTimer?: ReturnType<typeof setTimeout>
  private respawnTimer?: ReturnType<typeof setTimeout>
  private celebrating = false
  private baseScale = 0.44

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getContext: () => ToyContext,
  ) {
    this.container = scene.add.container(0, 0).setDepth(-50)

    const night = currentMood().night
    const dinoTexture = `companion-dino${night ? '-night' : ''}`
    this.body = scene.add.image(0, 0, dinoTexture).setScale(this.baseScale)

    this.trailDot1 = scene.add.image(18, -14, 'thoughtDot').setScale(0.28).setAlpha(0.85)
    this.trailDot2 = scene.add.image(30, -22, 'thoughtDot').setScale(0.42).setAlpha(0.9)
    this.bubble = scene.add.image(58, -36, 'thoughtBubble').setDisplaySize(64, 50).setAlpha(0.98)
    this.icon = scene.add.image(58, -36, 'star').setScale(CONFIG.thoughtBubble.targetScale)

    this.container.add([this.body, this.trailDot1, this.trailDot2, this.bubble, this.icon])

    this.startIdleTweens()
    this.setNewThought(false)
  }

  setGameMode(mode: string): void {
    const validMode: 'smash' | 'piano' | 'drawing' =
      mode === 'piano' || mode === 'drawing' ? mode : 'smash'
    if (this.gameMode !== validMode) {
      this.gameMode = validMode
      if (!this.celebrating) {
        this.setNewThought(true)
      }
    }
  }

  setVisible(visible: boolean): void {
    const wasVisible = this.container.visible
    this.container.setVisible(visible)
    if (visible && !wasVisible && !this.autoCycleTimer && !this.celebrating) {
      this.autoCycleTimer = setTimeout(() => {
        this.cycleThought()
      }, CONFIG.thoughtBubble.autoCycleMs)
    }
  }

  get visible(): boolean {
    return this.container.visible
  }

  /**
   * Layout the companion in the top-left corner, clear of edge-logo and bedtime moon.
   * Completely avoids intercepting touch corner holds.
   */
  layout(width: number, height: number, insets: { top: number; left: number }, night: boolean): void {
    let x = insets.left + 54
    let y = insets.top + 88

    // On narrow screens (e.g. mobile phones < 600px wide), the switcher buttons
    // sit across the top row (y ~= insets.top + 72). Drop companion below them.
    if (width < 600) {
      y = insets.top + 160
    }

    if (night) {
      const mx = width * 0.1 + insets.left
      const my = height * 0.15
      const r = Math.min(width, height) * 0.06
      if (Math.hypot(x - mx, y - my) < r + 56) {
        y = my + r + 44
      }
    }

    this.container.setPosition(x, y)
    this.body.setTexture(`companion-dino${night ? '-night' : ''}`)
    if (this.target) {
      this.updateTargetDisplay(this.target, currentMood().palette)
    }
  }

  /**
   * Handle candidate smash/note/drawing actions against the current target.
   * Returns true if matched and celebrated.
   */
  checkMatch(event: ThoughtMatchEvent): boolean {
    if (!this.container.visible || this.celebrating || !this.target) return false

    if (checkThoughtMatch(this.target, event)) {
      this.celebrate()
      return true
    }
    return false
  }

  private startIdleTweens(): void {
    // Gentle breathing on body
    this.scene.tweens.add({
      targets: this.body,
      scaleY: this.baseScale * 1.06,
      y: '+=2',
      duration: CONFIG.thoughtBubble.idleBobMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Gentle drift on thought bubble
    this.scene.tweens.add({
      targets: [this.bubble, this.icon, this.trailDot1, this.trailDot2],
      y: '-=4',
      duration: Math.round(CONFIG.thoughtBubble.idleBobMs * 1.2),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private setNewThought(animate = true): void {
    if (this.autoCycleTimer) clearTimeout(this.autoCycleTimer)

    const ctx = this.getContext()
    const palette = currentMood().palette
    this.target = pickNextThoughtTarget(
      this.target,
      this.gameMode,
      palette.length,
      () => ctx.rng.frac(),
    )

    this.updateTargetDisplay(this.target, palette)

    if (animate) {
      const bubbleItems = [this.bubble, this.trailDot1, this.trailDot2, this.icon]
      this.scene.tweens.killTweensOf(bubbleItems)
      bubbleItems.forEach((item) => {
        item.setScale(0)
        item.setAlpha(0)
      })
      this.scene.tweens.add({
        targets: this.trailDot1,
        scale: 0.28,
        alpha: 0.85,
        duration: 250,
        ease: 'Back.easeOut',
      })
      this.scene.tweens.add({
        targets: this.trailDot2,
        scale: 0.42,
        alpha: 0.9,
        duration: 250,
        ease: 'Back.easeOut',
      })
      this.scene.tweens.add({
        targets: this.bubble,
        scaleX: 64 / 128,
        scaleY: 50 / 96,
        alpha: 0.95,
        duration: 320,
        delay: 80,
        ease: 'Back.easeOut',
      })
      this.scene.tweens.add({
        targets: this.icon,
        scale: CONFIG.thoughtBubble.targetScale,
        alpha: 1,
        duration: 320,
        delay: 100,
        ease: 'Back.easeOut',
      })
    } else {
      this.trailDot1.setScale(0.28).setAlpha(0.85)
      this.trailDot2.setScale(0.42).setAlpha(0.9)
      this.bubble.setScale(64 / 128, 50 / 96).setAlpha(0.95)
      this.icon.setScale(CONFIG.thoughtBubble.targetScale).setAlpha(1)
    }

    this.autoCycleTimer = setTimeout(() => {
      this.cycleThought()
    }, CONFIG.thoughtBubble.autoCycleMs)
  }

  private updateTargetDisplay(target: ThoughtTarget, palette: readonly number[]): void {
    const night = currentMood().night
    const nightSuffix = night ? '-night' : ''

    // Reset icon transforms relative to bubble center
    this.icon.setPosition(58, -36)
    this.icon.setAngle(0)
    this.icon.setTint(0xffffff)

    switch (target.kind) {
      case 'color':
        this.icon.setTexture('circle')
        this.icon.setTint(palette[target.colorIndex % palette.length])
        break
      case 'shape':
        this.icon.setTexture(target.shape)
        if (target.colorIndex !== undefined) {
          this.icon.setTint(palette[target.colorIndex % palette.length])
        } else {
          // Tint with a friendly palette colour so the shape is never white on white
          const shapeColorIndex = (SHAPES_LIST.indexOf(target.shape) + 2) % palette.length
          this.icon.setTint(palette[shapeColorIndex])
        }
        break
      case 'animal':
        if (target.animal === 'dinosaur') {
          this.icon.setTexture(`companion-dino${nightSuffix}`)
        } else if (target.animal === 'shark') {
          this.icon.setTexture(`shark-grin${nightSuffix}`)
        } else {
          this.icon.setTexture(`animalFace-${target.animal}${nightSuffix}`)
        }
        break
      case 'note':
        this.icon.setTexture('note')
        this.icon.setTint(palette[target.colorIndex % palette.length])
        break
    }
  }

  private cycleThought(): void {
    if (this.celebrating || !this.container.visible) {
      this.autoCycleTimer = setTimeout(() => {
        this.cycleThought()
      }, CONFIG.thoughtBubble.autoCycleMs)
      return
    }

    const bubbleItems = [this.bubble, this.trailDot1, this.trailDot2, this.icon]
    this.scene.tweens.add({
      targets: bubbleItems,
      alpha: 0,
      scale: 0,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.setNewThought(true)
      },
    })
  }

  private celebrate(): void {
    if (this.celebrating) return
    this.celebrating = true
    if (this.autoCycleTimer) clearTimeout(this.autoCycleTimer)
    if (this.respawnTimer) clearTimeout(this.respawnTimer)

    const ctx = this.getContext()

    // 1. Companion backflip leap
    this.scene.tweens.add({
      targets: this.body,
      y: '-=34',
      angle: 360,
      duration: CONFIG.thoughtBubble.celebrateMs,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.body.angle = 0
        this.body.y = 0
        // Squash on landing
        this.scene.tweens.add({
          targets: this.body,
          scaleX: this.baseScale * 1.25,
          scaleY: this.baseScale * 0.8,
          duration: 120,
          yoyo: true,
          ease: 'Quad.easeInOut',
        })
      },
    })

    // 2. Icon flies to mouth & scales to 0
    this.scene.tweens.add({
      targets: this.icon,
      x: this.body.x,
      y: this.body.y,
      scale: 0,
      duration: 280,
      ease: 'Quad.easeIn',
    })

    // 3. Bubble & dots fade
    this.scene.tweens.add({
      targets: [this.bubble, this.trailDot1, this.trailDot2],
      alpha: 0,
      scale: 0,
      duration: 220,
      ease: 'Quad.easeIn',
    })

    // 4. Pooled star & dot celebration burst
    const spawnX = this.container.x
    const spawnY = this.container.y
    const palette = currentMood().palette
    for (let i = 0; i < CONFIG.thoughtBubble.sparkleCount; i++) {
      const angle = (i / CONFIG.thoughtBubble.sparkleCount) * Math.PI * 2
      const dist = ctx.rng.between(35, 75)
      const targetX = spawnX + Math.cos(angle) * dist
      const targetY = spawnY + Math.sin(angle) * dist
      const sparkle = ctx.pool.spawn(i % 2 === 0 ? 'star' : 'dot', spawnX, spawnY)
      sparkle.setTint(palette[i % palette.length])
      sparkle.setScale(ctx.rng.realInRange(0.3, 0.6))
      sparkle.setAlpha(1)
      this.scene.tweens.add({
        targets: sparkle,
        x: targetX,
        y: targetY,
        angle: ctx.rng.between(-45, 45),
        duration: 650,
        ease: 'Quad.easeOut',
      })
      ctx.pool.retire(sparkle, 500, 300)
    }

    // 5. Pentatonic celebration chime
    ctx.synth.chime()

    // 6. Respawn new thought after delay
    this.respawnTimer = setTimeout(() => {
      this.celebrating = false
      this.setNewThought(true)
    }, CONFIG.thoughtBubble.respawnMs)
  }

  destroy(): void {
    if (this.autoCycleTimer) clearTimeout(this.autoCycleTimer)
    if (this.respawnTimer) clearTimeout(this.respawnTimer)
    this.scene.tweens.killTweensOf([
      this.body,
      this.bubble,
      this.icon,
      this.trailDot1,
      this.trailDot2,
    ])
    this.container.destroy()
  }
}
