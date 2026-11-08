import type { GameObjects } from 'phaser'
import { CONFIG } from '../config'
import { findConstellationLinks, segmentTransform, type ConstellationAnchor } from './schemaMath'
import type { Toy } from './types'

interface LiveAnchor {
  anchor: ConstellationAnchor
  star: GameObjects.Image
}

const MAX_ANCHORS = 8
const anchors: LiveAnchor[] = []

/**
 * Connecting Schema: Constellation snapping where celestial stars link
 * with dynamic elastic luminous threads that twang into tension when placed
 * near recent anchors.
 */
export const connection: Toy = {
  name: 'connection',
  weight: 3,

  play(e, ctx) {
    const star = ctx.pool.spawn('star', e.x, e.y)
    star.setTint(ctx.color(e.index))
    star.setScale(0.1)

    ctx.scene.tweens.add({
      targets: star,
      scale: 0.75,
      duration: 300,
      ease: 'Back.easeOut',
    })

    const now = Date.now()
    // Prune stale or retired/recycled anchors
    while (
      anchors.length > 0 &&
      (!anchors[0].star.active ||
        !anchors[0].star.visible ||
        now - anchors[0].anchor.time > CONFIG.schemas.constellationAnchorAgeMs)
    ) {
      anchors.shift()
    }

    const activeCandidates = anchors
      .filter(a => a.star.active && a.star.visible)
      .map(a => a.anchor)

    const links = findConstellationLinks(
      { x: e.x, y: e.y },
      activeCandidates,
      {
        minDist: CONFIG.schemas.constellationMinDist,
        maxDist: CONFIG.schemas.constellationMaxDist,
        maxLinks: CONFIG.schemas.constellationMaxLinks,
        now,
        maxAgeMs: CONFIG.schemas.constellationAnchorAgeMs,
      },
    )

    if (links.length > 0) {
      for (const link of links) {
        const transform = segmentTransform(link.anchor, { x: e.x, y: e.y }, 64)
        const thread = ctx.pool.spawn('elasticSegment', transform.midpoint.x, transform.midpoint.y)
        thread.setAngle(transform.angleDeg)
        thread.setScale(transform.scaleX, 0.2)
        thread.setTint(ctx.color(link.anchor.colorIndex))

        ctx.scene.tweens.add({
          targets: thread,
          scaleY: 0.85,
          duration: 350,
          ease: 'Elastic.easeOut',
        })

        ctx.pool.retire(thread, 1400, 400)
      }

      ctx.synth.playArpeggio(ctx.combo.step)
      ctx.synth.play(e.index + 4, 'blip', 0.6)
    } else {
      const ring = ctx.pool.spawn('ring', e.x, e.y)
      ring.setTint(ctx.color(e.index))
      ring.setScale(0.2)
      ring.setAlpha(0.8)

      ctx.scene.tweens.add({
        targets: ring,
        scale: 1.8,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          ring.setVisible(false)
          ring.setActive(false)
        },
      })
      ctx.pool.retire(ring, 800, 200)

      ctx.synth.playArpeggio(ctx.combo.step)
    }

    ctx.pool.retire(star, CONFIG.schemas.constellationAnchorAgeMs, 500)

    anchors.push({
      anchor: { x: e.x, y: e.y, time: now, colorIndex: e.index },
      star,
    })
    if (anchors.length > MAX_ANCHORS) {
      anchors.shift()
    }
  },
}
