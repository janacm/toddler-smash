import Phaser from 'phaser'
import { CONFIG } from '../config'
import { currentMood } from '../settings'
import { calculateRotationalDust } from './schemaMath'
import type { Toy } from './types'

/**
 * Rotation Schema: Celestial pinwheels and vortices spinning with angular
 * acceleration, ejecting sparkling dust along tangent and centrifugal vectors.
 */
export const rotation: Toy = {
  name: 'rotation',
  weight: 3,

  play(e, ctx) {
    const mood = currentMood()
    const wheel = ctx.pool.spawn('pinwheel', e.x, e.y)
    wheel.setTint(ctx.color(e.index))
    wheel.setScale(0.15)
    wheel.setAngle(0)

    const targetScale = ctx.rng.realInRange(0.85, 1.2)
    ctx.scene.tweens.add({
      targets: wheel,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 350,
      ease: 'Back.easeOut',
    })

    const dir = (ctx.rng.pick([1, -1]) as number | null) ?? 1
    const totalSpinDeg = dir * ctx.rng.between(720, 1080)
    const spinDuration = Math.round(ctx.rng.between(1200, 1500) / mood.timeScale)

    ctx.scene.tweens.add({
      targets: wheel,
      angle: totalSpinDeg,
      duration: spinDuration,
      ease: 'Cubic.easeOut',
    })

    const spawnDust = (delayMs: number) => {
      if (!wheel.active) return
      const currentAngleRad = Phaser.Math.DegToRad(wheel.angle)
      const progress = Math.min(1, delayMs / spinDuration)
      const cubicDerivative = (3 * Math.pow(1 - progress, 2)) / (spinDuration / 1000)
      const totalRad = Phaser.Math.DegToRad(totalSpinDeg)
      const omega = totalRad * cubicDerivative

      const bladeRadius = 52 * wheel.scaleX
      const particles = calculateRotationalDust(
        { x: wheel.x, y: wheel.y },
        bladeRadius,
        currentAngleRad,
        4,
        omega,
        CONFIG.schemas.centrifugalBoost * mood.timeScale,
        0.5,
      )

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dot = ctx.pool.spawn('dot', p.tip.x, p.tip.y)
        dot.setTint(ctx.color(e.index + i + 1))
        dot.setScale(ctx.rng.realInRange(0.4, 0.8))

        const flightDuration = ctx.rng.between(400, 650)
        ctx.scene.tweens.add({
          targets: dot,
          x: p.target.x,
          y: p.target.y,
          alpha: 0,
          duration: flightDuration,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            dot.setVisible(false)
            dot.setActive(false)
          },
        })
        ctx.pool.retire(dot, flightDuration, 200)
      }
    }

    ctx.scene.time.delayedCall(150, () => spawnDust(150))
    ctx.scene.time.delayedCall(350, () => spawnDust(350))

    ctx.synth.play(e.index, 'blip')
    ctx.synth.play(e.index + 2, 'blip')

    ctx.pool.retire(wheel, 1100, 400)
  },
}
