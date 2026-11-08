import Phaser from 'phaser'
import { CONFIG } from '../config'
import { SHAPE_KEYS } from '../textures'
import type { Toy } from './types'

/**
 * A spray of shapes launched outward that arc down under gravity and bounce
 * once off the floor. The default reaction for any non-character input.
 */
export const shapeBurst: Toy = {
  name: 'shapeBurst',
  weight: 3,

  play(e, ctx) {
    const count = ctx.rng.between(4, 8)
    const floor = ctx.height - 40
    // Bedtime launches slower, spins less and settles softly, and lingers longer.
    const { speedScale, spinScale, bounceScale } = ctx.mood.motion
    const spinMax = CONFIG.motion.spinMax * spinScale
    const bounceHeight = 60 * CONFIG.motion.bounceDamping * bounceScale

    for (let i = 0; i < count; i++) {
      const shape = SHAPE_KEYS[ctx.rng.between(0, SHAPE_KEYS.length - 1)]
      const img = ctx.pool.spawn(shape, e.x, e.y)
      img.setTint(ctx.color(e.index + i))
      img.setScale(ctx.rng.realInRange(0.35, 0.85))

      const angle = ctx.rng.realInRange(-Math.PI * 0.9, -Math.PI * 0.1)
      const speed = ctx.rng.between(CONFIG.motion.burstSpeedMin, CONFIG.motion.burstSpeedMax) * speedScale
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed

      // Ballistic arc, hand-integrated rather than run through the physics
      // engine. Cheaper, and it keeps every toy independent of a shared world.
      const flightMs = ctx.rng.between(900, 1500)
      const targetX = e.x + (vx * flightMs) / 1000
      const apexY = e.y + (vy * flightMs) / 1000

      ctx.scene.tweens.add({
        targets: img,
        x: Phaser.Math.Clamp(targetX, 20, ctx.width - 20),
        duration: flightMs,
        ease: 'Linear',
      })

      ctx.scene.tweens.add({
        targets: img,
        y: apexY,
        duration: flightMs * 0.42,
        ease: 'Sine.easeOut',
        yoyo: false,
        onComplete: () => {
          ctx.scene.tweens.add({
            targets: img,
            y: floor,
            duration: flightMs * 0.58,
            ease: 'Sine.easeIn',
            onComplete: () => {
              // One small bounce. Two looks busy, none looks broken. The cue is
              // throttled inside the synth, so a landing burst makes one soft tap.
              ctx.synth.playCue('bounce', 0.2)
              ctx.scene.tweens.add({
                targets: img,
                y: floor - bounceHeight,
                duration: 260,
                ease: 'Sine.easeOut',
                yoyo: true,
              })
            },
          })
        },
      })

      ctx.scene.tweens.add({
        targets: img,
        angle: ctx.rng.between(-spinMax, spinMax),
        duration: flightMs,
        ease: 'Linear',
      })

      ctx.pool.retire(img, ctx.mood.decay.shapeMs)
    }

    // Fast streaks climb the arpeggio instead of picking a random note.
    ctx.synth.playArpeggio(ctx.combo.step)
  },
}
