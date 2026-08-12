import { CONFIG } from '../config'
import type { Toy } from './types'

/**
 * Expanding rings from the smash point. Cheap, and it gives every input a
 * visible origin — useful feedback when several things are happening at once.
 */
export const ripple: Toy = {
  name: 'ripple',
  weight: 2,

  play(e, ctx) {
    for (let i = 0; i < 3; i++) {
      const ring = ctx.pool.spawn('ring', e.x, e.y)
      ring.setTint(ctx.color(e.index + i))
      ring.setScale(0.2)
      ring.setAlpha(0.9)

      ctx.scene.tweens.add({
        targets: ring,
        scale: ctx.rng.realInRange(2.2, 3.8),
        alpha: 0,
        delay: i * 110,
        duration: CONFIG.lifetime.rippleMs,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          ring.setVisible(false)
          ring.setActive(false)
        },
      })
    }

    ctx.synth.play(ctx.rng.between(0, ctx.synth.noteCount - 1))
  },
}
