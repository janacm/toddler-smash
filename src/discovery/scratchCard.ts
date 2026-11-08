import Phaser from 'phaser'
import { CONFIG } from '../config'
import { brushPx, cardRect, scratchRadiusPx, type CardRect } from '../modes/drawingMath'
import type { ToyContext } from '../toys/types'
import { ILLUSTRATION_HEIGHT, ILLUSTRATION_WIDTH } from './illustrations'
import type { ScratchCardModel } from './scratchModel'
import type { BadgeId, ScratchCardId } from './types'

function badgeForCard(id: ScratchCardId): BadgeId {
  switch (id) {
    case 'dino':
      return 'scratchDino'
    case 'shark':
      return 'scratchShark'
    case 'sky':
      return 'scratchSky'
  }
}

export class ScratchCard {
  private readonly scene: Phaser.Scene
  private readonly model: ScratchCardModel
  readonly rect: CardRect
  private readonly backing: Phaser.GameObjects.Graphics
  private readonly illustration: Phaser.GameObjects.Image
  private readonly maskRT: Phaser.GameObjects.RenderTexture
  private isCelebrating = false
  private celebrationTimer?: Phaser.Time.TimerEvent

  constructor(
    ctx: ToyContext,
    model: ScratchCardModel,
    bottomInset = 0,
    wasCelebrating = false,
  ) {
    this.scene = ctx.scene
    this.model = model
    this.rect = cardRect(ctx.width, ctx.height, bottomInset)

    if (wasCelebrating) {
      this.model.advance()
    }

    const { x, y, width, height } = this.rect

    // Backing frame behind illustration
    this.backing = this.scene.add.graphics().setDepth(-180)
    this.backing.fillStyle(0xffffff, 0.95)
    this.backing.fillRoundedRect(x - 5, y - 5, width + 10, height + 10, 16)
    this.backing.lineStyle(4, 0xdbe2ea, 1)
    this.backing.strokeRoundedRect(x - 5, y - 5, width + 10, height + 10, 16)

    // Hidden illustration
    this.illustration = this.scene.add
      .image(x + width / 2, y + height / 2, `illustration-${this.model.cardId}`)
      .setDisplaySize(width, height)
      .setDepth(-175)

    // Mask render texture filled with scratch cover
    this.maskRT = this.scene.add
      .renderTexture(x, y, width, height)
      .setOrigin(0)
      .setDepth(-170)

    this.fillMask()

    // If rebuilding a partially scratched card, replay cleared cells
    if (!wasCelebrating && this.model.grid.clearedCount > 0) {
      const cw = width / this.model.grid.cols
      const ch = height / this.model.grid.rows
      const scale = (Math.max(cw, ch) * 1.35) / 120
      for (const cell of this.model.grid.clearedCells()) {
        const lx = (cell.col + 0.5) * cw
        const ly = (cell.row + 0.5) * ch
        this.maskRT.stamp('circle', undefined, lx, ly, { scale, erase: true })
      }
    }
  }

  get celebrating(): boolean {
    return this.isCelebrating
  }

  private fillMask(): void {
    const scaleX = this.rect.width / ILLUSTRATION_WIDTH
    const scaleY = this.rect.height / ILLUSTRATION_HEIGHT
    this.maskRT.clear()
    this.maskRT.stamp('scratch-cover', undefined, 0, 0, {
      originX: 0,
      originY: 0,
      scaleX,
      scaleY,
    })
    this.maskRT.setAlpha(1)
  }

  scratch(x: number, y: number, _batched: boolean, ctx: ToyContext): boolean {
    if (this.isCelebrating) return false

    const radius = scratchRadiusPx(brushPx(ctx.width, ctx.height))
    const { x: rx, y: ry, width, height } = this.rect

    if (
      x < rx - radius ||
      x > rx + width + radius ||
      y < ry - radius ||
      y > ry + height + radius
    ) {
      return false
    }

    const lx = x - rx
    const ly = y - ry
    const scale = (radius * 2) / 120

    this.maskRT.stamp('circle', undefined, lx, ly, {
      scale,
      erase: true,
    })

    const nx = lx / width
    const ny = ly / height
    const nrx = radius / width
    const nry = radius / height

    this.model.scratchPoint(nx, ny, nrx, nry)

    if (this.model.isComplete()) {
      this.triggerBloom(ctx)
    }

    return true
  }

  private triggerBloom(ctx: ToyContext): void {
    this.isCelebrating = true

    // 1. Mask dissolve
    this.scene.tweens.add({
      targets: this.maskRT,
      alpha: 0,
      duration: 450,
      ease: 'Sine.easeOut',
    })

    // 2. Artwork bounce
    const baseW = this.rect.width
    const baseH = this.rect.height
    this.scene.tweens.add({
      targets: this.illustration,
      displayWidth: baseW * 1.12,
      displayHeight: baseH * 1.12,
      duration: 280,
      yoyo: true,
      ease: 'Back.easeOut',
    })

    // 3. Pooled particle burst
    const cx = this.rect.x + this.rect.width / 2
    const cy = this.rect.y + this.rect.height / 2
    for (let i = 0; i < CONFIG.discovery.bloomParticles; i++) {
      const star = ctx.pool.spawn('star', cx, cy)
      star.setTint(ctx.color(i))
      const angle = (i / CONFIG.discovery.bloomParticles) * Math.PI * 2
      const speed = ctx.rng.between(180, 360)
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      this.scene.tweens.add({
        targets: star,
        x: cx + vx * 0.65,
        y: cy + vy * 0.65,
        scale: { from: 0.8, to: 0.2 },
        alpha: { from: 1, to: 0 },
        duration: 750,
        ease: 'Cubic.easeOut',
        onComplete: () => ctx.pool.retire(star, 0, 1),
      })
    }

    // 4. Audio fanfare
    const currentCard = this.model.cardId
    const voice = currentCard === 'dino' ? 'dinosaur' : currentCard === 'shark' ? 'bubble' : 'blip'
    CONFIG.discovery.bloomNotes.forEach((note, idx) => {
      this.scene.time.delayedCall(idx * 75, () => {
        ctx.synth.play(note, voice)
      })
    })

    // 5. Unlock card badge
    ctx.discover?.(badgeForCard(currentCard))

    // 6. Advance after pause
    this.celebrationTimer = this.scene.time.delayedCall(CONFIG.discovery.cardPauseMs, () => {
      this.advanceCard()
    })
  }

  private advanceCard(): void {
    this.model.advance()
    this.illustration.setTexture(`illustration-${this.model.cardId}`)
    this.fillMask()
    this.isCelebrating = false
  }

  destroy(): boolean {
    this.celebrationTimer?.remove()
    this.scene.tweens.killTweensOf([this.illustration, this.maskRT])
    this.backing.destroy()
    this.illustration.destroy()
    this.maskRT.destroy()
    return this.isCelebrating
  }
}
