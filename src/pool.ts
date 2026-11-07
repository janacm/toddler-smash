import Phaser from 'phaser'
import { CONFIG } from './config'

/**
 * A hard-capped ring of sprites.
 *
 * This is the single most important piece of mash tolerance in the game. A
 * toddler can generate input far faster than any "spawn a thing per press"
 * design can survive. Rather than rate-limiting the *fun* away, we let every
 * press spawn something and simply recycle the oldest sprite once we hit the
 * cap. Memory and draw calls stay flat no matter how long they lean on it.
 */
export class SpritePool {
  private ring: Phaser.GameObjects.Image[] = []
  private cursor = 0
  onSpawn?: (texture: string, img: Phaser.GameObjects.Image) => void

  constructor(private scene: Phaser.Scene) {}

  get active(): number {
    return this.ring.length
  }

  /** Park transient effects when a discovered puzzle needs a clear stage. */
  clear(): void {
    for (const img of this.ring) {
      this.scene.tweens.killTweensOf(img)
      img.setVisible(false).setActive(false)
    }
  }

  /**
   * Get a sprite showing `texture` at (x, y), reusing an old one if we are at
   * capacity. Any tween or physics state from the previous life is cleared.
   */
  spawn(texture: string, x: number, y: number): Phaser.GameObjects.Image {
    if (this.ring.length < CONFIG.limits.maxSprites) {
      const img = this.scene.add.image(x, y, texture)
      this.ring.push(img)
      this.onSpawn?.(texture, img)
      return img
    }

    const img = this.ring[this.cursor]
    this.cursor = (this.cursor + 1) % this.ring.length

    this.scene.tweens.killTweensOf(img)
    img.setTexture(texture)
    img.setPosition(x, y)
    img.setScale(1)
    img.setAlpha(1)
    img.setAngle(0)
    img.setFlip(false, false)
    img.setDepth(0)
    img.setTint(0xffffff)
    img.setVisible(true)
    img.setActive(true)
    this.onSpawn?.(texture, img)
    return img
  }

  /**
   * Fade a sprite out and park it. We never destroy — destroyed objects would
   * just have to be reallocated on the next keypress.
   */
  retire(img: Phaser.GameObjects.Image, delayMs: number, fadeMs = 400): void {
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scale: img.scale * 0.8,
      delay: delayMs,
      duration: fadeMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        img.setVisible(false)
        img.setActive(false)
      },
    })
  }
}

/**
 * The same ring trick for text objects.
 *
 * Text needs its own pool because every Phaser text object owns a canvas
 * texture — creating and destroying them per keypress is the one thing that
 * will actually stutter under sustained mashing.
 */
export class TextPool {
  private ring: Phaser.GameObjects.Text[] = []
  private cursor = 0
  private static readonly MAX = 28

  constructor(private scene: Phaser.Scene) {}

  clear(): void {
    for (const txt of this.ring) {
      this.scene.tweens.killTweensOf(txt)
      txt.setVisible(false).setActive(false)
    }
  }

  spawn(content: string, x: number, y: number, sizePx: number): Phaser.GameObjects.Text {
    let txt: Phaser.GameObjects.Text

    if (this.ring.length < TextPool.MAX) {
      txt = this.scene.add.text(x, y, content, {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontStyle: 'bold',
      })
      txt.setOrigin(0.5)
      this.ring.push(txt)
    } else {
      txt = this.ring[this.cursor]
      this.cursor = (this.cursor + 1) % this.ring.length
      this.scene.tweens.killTweensOf(txt)
      txt.setText(content)
      txt.setPosition(x, y)
      txt.setAlpha(1)
      txt.setAngle(0)
      txt.setVisible(true)
      txt.setActive(true)
    }

    txt.setFontSize(sizePx)
    txt.setScale(1)
    return txt
  }

  retire(txt: Phaser.GameObjects.Text, delayMs: number, fadeMs = 500): void {
    this.scene.tweens.add({
      targets: txt,
      alpha: 0,
      delay: delayMs,
      duration: fadeMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        txt.setVisible(false)
        txt.setActive(false)
      },
    })
  }
}
