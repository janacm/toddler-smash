import { CONFIG } from '../config'
import type { Toy } from './types'

/**
 * A googly-eyed blob that squashes in and wanders off.
 *
 * Faces earn disproportionate attention from small children, so this toy is
 * weighted low on purpose — it should feel like a treat, not the default.
 */
export const critter: Toy = {
  name: 'critter',
  weight: 1,

  play(e, ctx) {
    const color = ctx.color(e.index)
    const scale = ctx.rng.realInRange(0.8, 1.3)

    const body = ctx.pool.spawn('circle', e.x, e.y)
    body.setTint(color)
    body.setScale(0.1)

    const eyeOffsetX = 26 * scale
    const eyeOffsetY = -14 * scale

    const eyeL = ctx.pool.spawn('circle', e.x - eyeOffsetX, e.y + eyeOffsetY)
    const eyeR = ctx.pool.spawn('circle', e.x + eyeOffsetX, e.y + eyeOffsetY)
    for (const eye of [eyeL, eyeR]) {
      eye.setTint(0xffffff)
      eye.setScale(0.001)
      eye.setDepth(1)
    }

    const pupilL = ctx.pool.spawn('dot', e.x - eyeOffsetX, e.y + eyeOffsetY)
    const pupilR = ctx.pool.spawn('dot', e.x + eyeOffsetX, e.y + eyeOffsetY)
    for (const pupil of [pupilL, pupilR]) {
      pupil.setTint(0x1a1a2e)
      pupil.setScale(0.001)
      pupil.setDepth(2)
    }

    // Squash-and-stretch entrance.
    ctx.scene.tweens.add({
      targets: body,
      scale,
      duration: 380,
      ease: 'Back.easeOut',
    })
    ctx.scene.tweens.add({
      targets: [eyeL, eyeR],
      scale: 0.22 * scale,
      duration: 380,
      delay: 90,
      ease: 'Back.easeOut',
    })
    ctx.scene.tweens.add({
      targets: [pupilL, pupilR],
      scale: 0.9 * scale,
      duration: 380,
      delay: 140,
      ease: 'Back.easeOut',
    })

    // Hop away. Eyes and pupils ride along by the same delta.
    const driftX = ctx.rng.between(-160, 160)
    const driftY = ctx.rng.between(-120, 60)
    ctx.scene.tweens.add({
      targets: [body, eyeL, eyeR, pupilL, pupilR],
      x: `+=${driftX}`,
      y: `+=${driftY}`,
      duration: CONFIG.lifetime.shapeMs,
      ease: 'Sine.easeInOut',
    })

    for (const part of [body, eyeL, eyeR, pupilL, pupilR]) {
      ctx.pool.retire(part, CONFIG.lifetime.shapeMs * 0.7)
    }

    ctx.synth.chime()
  },
}
