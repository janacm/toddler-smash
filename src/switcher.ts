import Phaser from 'phaser'
import type { Mode } from './modes'

interface Button {
  mode: Mode
  base: Phaser.GameObjects.Image
  icon: Phaser.GameObjects.Image
  x: number
  y: number
}

const RADIUS = 46
const SPACING = 108
const MARGIN = 26

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

  layout(opts: { width: number; current: Mode; visible: boolean; night: boolean; color: (i: number) => number }): void {
    this.clear()
    if (!opts.visible) return

    this.modes.forEach((mode, i) => {
      const x = opts.width - MARGIN - RADIUS - (this.modes.length - 1 - i) * SPACING
      const y = MARGIN + RADIUS
      const selected = mode === opts.current
      const scale = selected ? 1 : 0.8

      const base = this.scene.add
        .image(x, y, 'circle')
        .setDisplaySize(RADIUS * 2 * scale, RADIUS * 2 * scale)
        .setTint(opts.night ? 0x2a2f5a : 0xffffff)
        .setAlpha(selected ? 0.95 : 0.7)
        .setDepth(5000)
      const icon = this.scene.add
        .image(x, y, mode.icon)
        .setDisplaySize(RADIUS * 1.2 * scale, RADIUS * 1.2 * scale)
        .setTint(opts.color(i * 3))
        .setAlpha(selected ? 1 : 0.75)
        .setDepth(5001)

      this.buttons.push({ mode, base, icon, x, y })
    })
  }

  /** The mode whose button contains (x, y), if any. */
  hit(x: number, y: number): Mode | undefined {
    return this.buttons.find((b) => Phaser.Math.Distance.Between(x, y, b.x, b.y) <= RADIUS * 1.15)?.mode
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
