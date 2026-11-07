import Phaser from 'phaser'
import { CONFIG } from '../config'
import type { SpritePool } from '../pool'
import type { Synth } from '../audio'
import { safeAreaInsets } from '../safeArea'
import type { AlbumModel } from './albumModel'
import type { BadgeDefinition, BadgeId } from './types'

interface SlotView {
  badge: BadgeDefinition
  x: number
  y: number
  size: number
  unlocked: boolean
  elements: Phaser.GameObjects.GameObject[]
}

export class DiscoveryTray {
  private readonly scene: Phaser.Scene
  private readonly album: AlbumModel
  private readonly getContext: () => {
    pool: SpritePool
    synth: Synth
    rng: Phaser.Math.RandomDataGenerator
    color: (seed?: number) => number
  }

  private bg?: Phaser.GameObjects.Graphics
  private slots: SlotView[] = []
  private activeDance?: {
    badgeId: BadgeId
    cancel: () => void
  }

  private lastWidth = 0
  private lastHeight = 0
  private lastMode = ''
  private lastNight = false

  constructor(
    scene: Phaser.Scene,
    album: AlbumModel,
    getContext: () => {
      pool: SpritePool
      synth: Synth
      rng: Phaser.Math.RandomDataGenerator
      color: (seed?: number) => number
    },
  ) {
    this.scene = scene
    this.album = album
    this.getContext = getContext
  }

  layout(opts: { width: number; height: number; mode: string; night: boolean }): void {
    this.lastWidth = opts.width
    this.lastHeight = opts.height
    this.lastMode = opts.mode
    this.lastNight = opts.night

    this.cancelDance()
    this.clearVisuals()

    const badges = this.album.getBadges()
    const isMobile = opts.width < 600
    const stampSize = isMobile
      ? CONFIG.discovery.mobileBadgeStampSize
      : CONFIG.discovery.badgeStampSize

    const spacing = stampSize + (isMobile ? 10 : 16)
    const totalSpan = (badges.length - 1) * spacing
    const cx = opts.width / 2
    const startX = cx - totalSpan / 2

    const safeBottom = safeAreaInsets().bottom
    let y = opts.height - safeBottom - stampSize / 2 - 10
    if (opts.mode === 'piano') {
      const pianoTop = opts.height * (1 - CONFIG.piano.heightFrac - 0.04)
      y = Math.max(stampSize / 2 + 10, pianoTop - stampSize / 2 - 12)
    }

    // Pill background
    const pillW = totalSpan + stampSize + (isMobile ? 18 : 28)
    const pillH = stampSize + (isMobile ? 12 : 18)
    const pillX = cx - pillW / 2
    const pillY = y - pillH / 2

    const g = this.scene.add.graphics().setDepth(-45)
    g.fillStyle(opts.night ? 0x0f172a : 0x1e293b, opts.night ? 0.38 : 0.22)
    g.fillRoundedRect(pillX, pillY, pillW, pillH, pillH / 2)
    g.lineStyle(2, 0xffffff, opts.night ? 0.15 : 0.2)
    g.strokeRoundedRect(pillX, pillY, pillW, pillH, pillH / 2)
    this.bg = g

    this.slots = []

    for (let i = 0; i < badges.length; i++) {
      const b = badges[i]
      const bx = startX + i * spacing
      const by = y
      const unlocked = this.album.has(b.id)
      const elements: Phaser.GameObjects.GameObject[] = []

      if (unlocked) {
        const rim = this.scene.add
          .image(bx, by, 'badge-rim')
          .setDisplaySize(stampSize, stampSize)
          .setDepth(-40)

        const icon = this.scene.add
          .image(bx, by, b.icon)
          .setDisplaySize(stampSize * 0.72, stampSize * 0.72)
          .setDepth(-39)

        // Breathing idle animation
        const rimScale = rim.scaleX
        const iconScale = icon.scaleX
        this.scene.tweens.add({
          targets: rim,
          scaleX: rimScale * 1.06,
          scaleY: rimScale * 1.06,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 180,
        })
        this.scene.tweens.add({
          targets: icon,
          scaleX: iconScale * 1.06,
          scaleY: iconScale * 1.06,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: i * 180,
        })

        elements.push(rim, icon)
      } else {
        const slot = this.scene.add
          .image(bx, by, 'badge-slot')
          .setDisplaySize(stampSize, stampSize)
          .setAlpha(0.65)
          .setDepth(-40)

        elements.push(slot)
      }

      this.slots.push({
        badge: b,
        x: bx,
        y: by,
        size: stampSize,
        unlocked,
        elements,
      })
    }
  }

  refresh(): void {
    if (this.lastWidth > 0 && this.lastHeight > 0) {
      this.layout({
        width: this.lastWidth,
        height: this.lastHeight,
        mode: this.lastMode,
        night: this.lastNight,
      })
    }
  }

  hit(x: number, y: number): BadgeDefinition | undefined {
    for (const slot of this.slots) {
      if (!slot.unlocked) continue
      const dist = Math.hypot(x - slot.x, y - slot.y)
      if (dist <= slot.size * 0.65) {
        this.onTapBadge(slot)
        return slot.badge
      }
    }
    return undefined
  }

  private onTapBadge(slot: SlotView): void {
    // If tapping the badge that is currently dancing, cancel it cleanly
    if (this.activeDance) {
      const sameBadge = this.activeDance.badgeId === slot.badge.id
      this.cancelDance()
      if (sameBadge) return
    }

    const { pool, synth, rng, color } = this.getContext()
    const cx = this.lastWidth / 2
    const cy = this.lastHeight / 2
    const targetSize = Math.min(180, Math.min(this.lastWidth, this.lastHeight) * 0.35)

    const rim = this.scene.add
      .image(slot.x, slot.y, 'badge-rim')
      .setDisplaySize(slot.size, slot.size)
      .setDepth(300)

    const icon = this.scene.add
      .image(slot.x, slot.y, slot.badge.icon)
      .setDisplaySize(slot.size * 0.72, slot.size * 0.72)
      .setDepth(301)

    // Sound
    synth.play(slot.badge.voice === 'bubble' ? 5 : 2, slot.badge.voice)

    // Sparkles
    for (let i = 0; i < 8; i++) {
      const star = pool.spawn('star', cx, cy)
      star.setTint(color(i))
      const angle = (i / 8) * Math.PI * 2
      const speed = rng.between(120, 240)
      this.scene.tweens.add({
        targets: star,
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed,
        scale: { from: 0.6, to: 0.1 },
        alpha: { from: 1, to: 0 },
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => pool.retire(star, 0, 1),
      })
    }

    let returned = false
    const cancel = () => {
      if (returned) return
      returned = true
      this.scene.tweens.killTweensOf([rim, icon])
      rim.destroy()
      icon.destroy()
    }

    this.activeDance = {
      badgeId: slot.badge.id,
      cancel,
    }

    // Tween to center
    this.scene.tweens.add({
      targets: rim,
      x: cx,
      y: cy,
      displayWidth: targetSize,
      displayHeight: targetSize,
      duration: 300,
      ease: 'Back.easeOut',
    })
    this.scene.tweens.add({
      targets: icon,
      x: cx,
      y: cy,
      displayWidth: targetSize * 0.72,
      displayHeight: targetSize * 0.72,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (returned) return
        // Wiggle dance
        this.scene.tweens.add({
          targets: [rim, icon],
          angle: 12,
          duration: 120,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (returned) return
            // Return to slot
            this.scene.tweens.add({
              targets: rim,
              x: slot.x,
              y: slot.y,
              displayWidth: slot.size,
              displayHeight: slot.size,
              angle: 0,
              duration: 280,
              ease: 'Quad.easeInOut',
            })
            this.scene.tweens.add({
              targets: icon,
              x: slot.x,
              y: slot.y,
              displayWidth: slot.size * 0.72,
              displayHeight: slot.size * 0.72,
              angle: 0,
              duration: 280,
              ease: 'Quad.easeInOut',
              onComplete: () => {
                cancel()
                if (this.activeDance?.badgeId === slot.badge.id) {
                  this.activeDance = undefined
                }
              },
            })
          },
        })
      },
    })
  }

  cancelDance(): void {
    if (this.activeDance) {
      this.activeDance.cancel()
      this.activeDance = undefined
    }
  }

  private clearVisuals(): void {
    this.bg?.destroy()
    this.bg = undefined
    for (const slot of this.slots) {
      for (const el of slot.elements) {
        this.scene.tweens.killTweensOf(el)
        el.destroy()
      }
    }
    this.slots = []
  }

  destroy(): void {
    this.cancelDance()
    this.clearVisuals()
  }
}
