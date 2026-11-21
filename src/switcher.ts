import Phaser from 'phaser'
import type { Mode } from './modes'

interface Button {
  mode: Mode
  base: Phaser.GameObjects.Image
  icon: Phaser.GameObjects.Image
  x: number
  y: number
  radius: number
}

const RADIUS = 46
const SPACING = 108
const MARGIN = 26
const NARROW_WIDTH = 520
const NARROW_RADIUS = 34
const NARROW_SPACING = 86
const NARROW_MARGIN = 20

/**
 * The child's way to change sub-game: one big round picture button per mode in
 * the top-right corner, with the current one shown larger. Tap or click only.
 * A keyboard shortcut would be mashed constantly, while tapping a picture is
 * a choice. The grown-up panel can hide these.
 */
export class ModeSwitcher {
  private buttons: Button[] = []

  constructor(
    private scene: Phaser.Scene,
    private modes: Mode[],
  ) {}

  layout(opts: {
    width: number
    /** Safe-area insets, so buttons stay clear of a notch or rounded corner. */
    inset: { top: number; right: number }
    current: Mode
    visible: boolean
    night: boolean
    color: (i: number) => number
  }): void {
    this.clear()
    if (!opts.visible) return

    const narrow = opts.width < NARROW_WIDTH
    const radius = narrow ? NARROW_RADIUS : RADIUS
    const spacing = narrow ? NARROW_SPACING : SPACING
    const margin = narrow ? NARROW_MARGIN : MARGIN

    this.modes.forEach((mode, i) => {
      const x = opts.width - opts.inset.right - margin - radius - (this.modes.length - 1 - i) * spacing
      const y = opts.inset.top + MARGIN + radius
      const selected = mode === opts.current
      const scale = selected ? 1 : 0.8

      const base = this.scene.add
        .image(x, y, 'circle')
        .setDisplaySize(radius * 2 * scale, radius * 2 * scale)
        .setTint(opts.night ? 0x2a2f5a : 0xffffff)
        .setAlpha(selected ? 0.95 : 0.7)
        .setDepth(5000)
      const icon = this.scene.add
        .image(x, y, mode.icon)
        .setDisplaySize(radius * 1.2 * scale, radius * 1.2 * scale)
        .setTint(opts.color(i * 3))
        .setAlpha(selected ? 1 : 0.75)
        .setDepth(5001)

      this.buttons.push({ mode, base, icon, x, y, radius })
    })
  }

  /** The mode whose button contains (x, y), if any. */
  hit(x: number, y: number): Mode | undefined {
    return this.buttons.find((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) <= b.radius * 1.15)?.mode
  }

  /** A little wiggle, for tapping the button of the game already running. */
  wiggle(mode: Mode): void {
    const button = this.buttons.find((b) => b.mode === mode)
    if (!button) return
    this.scene.tweens.add({
      targets: button.icon,
      angle: { from: -14, to: 14 },
      duration: 90,
      yoyo: true,
      repeat: 1,
      onComplete: () => button.icon.setAngle(0),
    })
  }

  private clear(): void {
    for (const b of this.buttons) {
      this.scene.tweens.killTweensOf([b.base, b.icon])
      b.base.destroy()
      b.icon.destroy()
    }
    this.buttons = []
  }
}
