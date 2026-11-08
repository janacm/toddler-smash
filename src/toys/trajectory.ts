import Phaser from 'phaser'
import { CONFIG } from '../config'
import { currentMood } from '../settings'
import { calculateBounceRay, calculateSquashStretch } from './schemaMath'
import type { Toy } from './types'

/**
 * Trajectory Schema: Cosmic glowing orbs flung along ballistic vectors
 * that collide with screen margins, squash and stretch, trigger a woody pop,
 * and rebound back into play.
 */
export const trajectory: Toy = {
  name: 'trajectory',
  weight: 3,

  play(e, ctx) {
    const mood = currentMood()
    const speed = ctx.rng.between(CONFIG.schemas.trajectorySpeedMin, CONFIG.schemas.trajectorySpeedMax) * mood.timeScale
    const angle = ctx.rng.realInRange(-Math.PI * 0.95, -Math.PI * 0.05)
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed

    const margin = 28
    const bounds = {
      minX: margin,
      minY: margin,
      maxX: ctx.width - margin,
      maxY: ctx.height - margin,
    }

    const ray = calculateBounceRay(
      { x: e.x, y: e.y },
      { x: vx, y: vy },
      bounds,
      0,
      CONFIG.schemas.trajectoryRestitution,
    )

    const orb = ctx.pool.spawn('orbGlow', e.x, e.y)
    orb.setTint(ctx.color(e.index))
    const baseScale = ctx.rng.realInRange(0.75, 1.15)
    orb.setScale(baseScale)

    // Prompt audio on launch climbs the combo arpeggio immediately
    ctx.synth.playArpeggio(ctx.combo.step)

    const flightMs = Math.max(100, Math.min(1800, ray.flightDurationMs))

    ctx.scene.tweens.add({
      targets: orb,
      x: ray.hitPoint.x,
      y: ray.hitPoint.y,
      duration: flightMs,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!orb.active) return

        ctx.synth.play(e.index + 2, 'pop', 0.85)

        const squash = calculateSquashStretch(baseScale, ray.normal, 0.45)

        ctx.scene.tweens.add({
          targets: orb,
          scaleX: squash.scaleX,
          scaleY: squash.scaleY,
          duration: 60,
          ease: 'Sine.easeIn',
          onComplete: () => {
            if (!orb.active) return
            ctx.scene.tweens.add({
              targets: orb,
              scaleX: baseScale,
              scaleY: baseScale,
              duration: 90,
              ease: 'Sine.easeOut',
            })
          },
        })

        const sparkCount = ctx.rng.between(3, 4)
        for (let i = 0; i < sparkCount; i++) {
          const dot = ctx.pool.spawn('dot', ray.hitPoint.x, ray.hitPoint.y)
          dot.setTint(ctx.color(e.index + i + 1))
          dot.setScale(ctx.rng.realInRange(0.6, 1.0))
          const sparkAngle = Math.atan2(ray.normal.y, ray.normal.x) + ctx.rng.realInRange(-0.7, 0.7)
          const sparkSpeed = ctx.rng.between(80, 220) * mood.timeScale
          const sparkDuration = ctx.rng.between(250, 400)
          ctx.scene.tweens.add({
            targets: dot,
            x: ray.hitPoint.x + Math.cos(sparkAngle) * sparkSpeed * (sparkDuration / 1000),
            y: ray.hitPoint.y + Math.sin(sparkAngle) * sparkSpeed * (sparkDuration / 1000),
            alpha: 0,
            duration: sparkDuration,
            ease: 'Quad.easeOut',
            onComplete: () => {
              dot.setVisible(false)
              dot.setActive(false)
            },
          })
          ctx.pool.retire(dot, sparkDuration, 150)
        }

        const reboundDuration = ctx.rng.between(350, 500)
        const reboundX = Phaser.Math.Clamp(
          ray.hitPoint.x + (ray.reflectedVelocity.x * reboundDuration) / 1000,
          margin,
          ctx.width - margin,
        )
        const reboundY = Phaser.Math.Clamp(
          ray.hitPoint.y + (ray.reflectedVelocity.y * reboundDuration) / 1000,
          margin,
          ctx.height - margin,
        )

        ctx.scene.tweens.add({
          targets: orb,
          x: reboundX,
          y: reboundY,
          duration: reboundDuration,
          ease: 'Sine.easeOut',
        })

        ctx.pool.retire(orb, reboundDuration, 300)
      },
    })
  },
}
