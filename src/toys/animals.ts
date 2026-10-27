import { CONFIG } from '../config'
import { currentMood } from '../settings'
import { letterPop } from './letterPop'
import type { SmashEvent, Toy, ToyContext } from './types'

type Animal = 'dinosaur' | 'shark'

/** Ordinary taps can meet either animal; D and S make favourites repeatable. */
export const dinosaur: Toy = {
  name: 'dinosaur',
  weight: 3,
  play: (e, ctx) => visit('dinosaur', e, ctx),
}

export const shark: Toy = {
  name: 'shark',
  weight: 3,
  play: (e, ctx) => visit('shark', e, ctx),
}

export const animalKeys: Toy = {
  name: 'animalKeys',
  match: (e) => e.char === 'D' || e.char === 'S',
  play(e, ctx) {
    // Keep the exact letter feedback children already receive from Smash.
    letterPop.play(e, ctx)
    visit(e.char === 'D' ? 'dinosaur' : 'shark', e, ctx)
  },
}

function visit(animal: Animal, e: SmashEvent, ctx: ToyContext): void {
  const night = currentMood().night
  const suffix = night ? '-night' : ''
  const reaction = e.index % 3
  const size = Math.min(224, Math.min(ctx.width, ctx.height) * 0.42)
  const scale = size / 256
  const margin = size / 2 + 12
  const x = clamp(e.x, margin, ctx.width - margin)
  const y = clamp(e.y + (e.source === 'key' ? size * 0.65 : 0), margin + 20, ctx.height - margin - 24)
  const direction = x > ctx.width / 2 ? -1 : 1
  const expressive = reaction !== 1
  const texture = animal === 'dinosaur'
    ? `dinosaur${expressive ? '-roar' : ''}${suffix}`
    : `shark${expressive ? '-grin' : ''}${suffix}`
  const body = ctx.pool.spawn(texture, x, y)
  body.setTint(0xffffff).setFlipX(direction < 0).setDepth(3).setScale(scale * 0.2)

  ctx.scene.tweens.add({
    targets: body,
    scaleX: scale,
    scaleY: scale,
    duration: 300,
    ease: 'Back.easeOut',
  })

  if (animal === 'dinosaur') {
    // A stomp, a little hop, or a pleased head-to-tail wiggle.
    ctx.scene.tweens.add({
      targets: body,
      y: y - [12, 42, 18][reaction],
      angle: [0, -8, 9][reaction] * direction,
      duration: [240, 430, 280][reaction],
      delay: 320,
      yoyo: true,
      repeat: reaction === 1 ? 1 : 2,
      ease: 'Sine.easeInOut',
    })
    for (let i = 0; i < 3; i++) {
      const foot = ctx.pool.spawn('footprint', x + (i - 1) * 33 * direction, y + size * 0.35)
      foot.setTint(night ? 0xa8c6c0 : 0x668f61).setAlpha(0.45).setScale(scale * 0.55)
      foot.setAngle((i % 2 === 0 ? -12 : 12) * direction)
      ctx.pool.retire(foot, 700 + i * 140, 600)
    }
    ctx.synth.play(e.index % 5, 'dinosaur', 0.7)
  } else {
    // Swim in toward the board, bob through bubbles, or give a tail wiggle.
    ctx.scene.tweens.add({
      targets: body,
      x: clamp(x + direction * [72, 34, 18][reaction], margin, ctx.width - margin),
      y: clamp(y + [-18, -38, 12][reaction], margin, ctx.height - margin),
      duration: 2200,
      ease: 'Sine.easeInOut',
    })
    ctx.scene.tweens.add({
      targets: body,
      angle: (reaction === 2 ? 11 : 5) * direction,
      duration: 360,
      delay: 320,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    })
    for (let i = 0; i < 4; i++) {
      const bubble = ctx.pool.spawn('bubble', x - direction * (size * 0.3 + i * 10), y + i * 15)
      bubble.setTint(night ? 0x9ad0ec : 0x4d9cc1).setAlpha(0.7).setScale(scale * (0.4 + i * 0.16))
      ctx.scene.tweens.add({
        targets: bubble,
        y: Math.max(24, y - 60 - i * 24),
        x: bubble.x - direction * 25,
        duration: 1600 + i * 100,
        ease: 'Sine.easeOut',
      })
      ctx.pool.retire(bubble, 1000 + i * 120, 600)
    }
    ctx.synth.play(5 + e.index % 5, 'bubble', 0.65)
  }

  // All delayed work targets pooled sprites, so recycling cancels it safely.
  ctx.pool.retire(body, CONFIG.lifetime.shapeMs * 1.35, 650)
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(Math.max(low, high), value))
}
