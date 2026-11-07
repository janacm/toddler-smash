import { describe, expect, it } from 'vitest'
import {
  calculateBounceRay,
  calculateRotationalDust,
  calculateSquashStretch,
  findConstellationLinks,
  segmentTransform,
  type Box2D,
  type ConstellationAnchor,
} from './schemaMath'

describe('calculateBounceRay', () => {
  const bounds: Box2D = { minX: 10, minY: 10, maxX: 110, maxY: 110 }

  it('handles zero velocity gracefully', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: 0, y: 0 }, bounds)
    expect(res.hitPoint).toEqual({ x: 50, y: 50 })
    expect(res.normal).toEqual({ x: 0, y: 0 })
    expect(res.flightDistance).toBe(0)
    expect(res.flightDurationMs).toBe(0)
    expect(res.reflectedVelocity).toEqual({ x: 0, y: 0 })
  })

  it('clamps origin when starting outside bounds', () => {
    const res = calculateBounceRay({ x: 0, y: 50 }, { x: 100, y: 0 }, bounds)
    expect(res.hitPoint).toEqual({ x: 110, y: 50 })
    expect(res.flightDistance).toBe(100) // from clamped x=10 to x=110
  })

  it('reflects horizontally against right wall', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: 100, y: 0 }, bounds, 0, 0.8)
    expect(res.hitPoint.x).toBeCloseTo(110)
    expect(res.hitPoint.y).toBeCloseTo(50)
    expect(res.normal).toEqual({ x: -1, y: 0 })
    expect(res.flightDistance).toBeCloseTo(60)
    expect(res.flightDurationMs).toBeCloseTo(600)
    expect(res.reflectedVelocity.x).toBeCloseTo(-80)
    expect(res.reflectedVelocity.y).toBeCloseTo(0)
  })

  it('reflects horizontally against left wall', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: -200, y: 0 }, bounds, 0, 0.5)
    expect(res.hitPoint.x).toBeCloseTo(10)
    expect(res.hitPoint.y).toBeCloseTo(50)
    expect(res.normal).toEqual({ x: 1, y: 0 })
    expect(res.flightDistance).toBeCloseTo(40)
    expect(res.flightDurationMs).toBeCloseTo(200)
    expect(res.reflectedVelocity.x).toBeCloseTo(100)
    expect(res.reflectedVelocity.y).toBeCloseTo(0)
  })

  it('reflects vertically against top wall', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: 0, y: -100 }, bounds, 0, 0.7)
    expect(res.hitPoint.x).toBeCloseTo(50)
    expect(res.hitPoint.y).toBeCloseTo(10)
    expect(res.normal).toEqual({ x: 0, y: 1 })
    expect(res.flightDistance).toBeCloseTo(40)
    expect(res.flightDurationMs).toBeCloseTo(400)
    expect(res.reflectedVelocity.x).toBeCloseTo(0)
    expect(res.reflectedVelocity.y).toBeCloseTo(70)
  })

  it('reflects vertically against bottom wall', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: 0, y: 100 }, bounds, 0, 0.75)
    expect(res.hitPoint.x).toBeCloseTo(50)
    expect(res.hitPoint.y).toBeCloseTo(110)
    expect(res.normal).toEqual({ x: 0, y: -1 })
    expect(res.flightDistance).toBeCloseTo(60)
    expect(res.flightDurationMs).toBeCloseTo(600)
    expect(res.reflectedVelocity.x).toBeCloseTo(0)
    expect(res.reflectedVelocity.y).toBeCloseTo(-75)
  })

  it('accounts for radius margin', () => {
    const res = calculateBounceRay({ x: 50, y: 50 }, { x: 100, y: 0 }, bounds, 5, 1)
    expect(res.hitPoint.x).toBeCloseTo(105) // 110 - 5
    expect(res.flightDistance).toBeCloseTo(55)
  })

  it('handles simultaneous corner hits', () => {
    // Bottom-right corner hit
    const resBR = calculateBounceRay({ x: 50, y: 50 }, { x: 100, y: 100 }, bounds, 0, 0.5)
    expect(resBR.hitPoint.x).toBeCloseTo(110)
    expect(resBR.hitPoint.y).toBeCloseTo(110)
    expect(resBR.normal.x).toBeCloseTo(-1 / Math.SQRT2)
    expect(resBR.normal.y).toBeCloseTo(-1 / Math.SQRT2)
    expect(resBR.reflectedVelocity.x).toBeCloseTo(-50)
    expect(resBR.reflectedVelocity.y).toBeCloseTo(-50)

    // Top-left corner hit
    const resTL = calculateBounceRay({ x: 50, y: 50 }, { x: -100, y: -100 }, bounds, 0, 0.5)
    expect(resTL.hitPoint.x).toBeCloseTo(10)
    expect(resTL.hitPoint.y).toBeCloseTo(10)
    expect(resTL.normal.x).toBeCloseTo(1 / Math.SQRT2)
    expect(resTL.normal.y).toBeCloseTo(1 / Math.SQRT2)
    expect(resTL.reflectedVelocity.x).toBeCloseTo(50)
    expect(resTL.reflectedVelocity.y).toBeCloseTo(50)
  })
})

describe('calculateSquashStretch', () => {
  it('squashes X and stretches Y on horizontal wall collision', () => {
    const res = calculateSquashStretch(1.0, { x: 1, y: 0 }, 0.5)
    expect(res.scaleX).toBeCloseTo(0.5)
    expect(res.scaleY).toBeCloseTo(1 / Math.sqrt(0.5))
  })

  it('squashes Y and stretches X on vertical wall collision', () => {
    const res = calculateSquashStretch(1.0, { x: 0, y: -1 }, 0.25)
    expect(res.scaleY).toBeCloseTo(0.25)
    expect(res.scaleX).toBeCloseTo(1 / Math.sqrt(0.25)) // 2.0
  })

  it('applies baseScale factor accurately', () => {
    const res = calculateSquashStretch(2.0, { x: 0, y: 1 }, 0.5)
    expect(res.scaleY).toBeCloseTo(1.0)
    expect(res.scaleX).toBeCloseTo(2.0 / Math.sqrt(0.5))
  })

  it('handles diagonal impact', () => {
    const res = calculateSquashStretch(1.0, { x: 1 / Math.SQRT2, y: 1 / Math.SQRT2 }, 0.5)
    // Equal absolute values falls into predominantly vertical/equal branch
    expect(res.scaleY).toBeCloseTo(0.5)
    expect(res.scaleX).toBeCloseTo(1 / Math.sqrt(0.5))
  })
})

describe('calculateRotationalDust', () => {
  it('returns empty array when blade count is zero or negative', () => {
    expect(calculateRotationalDust({ x: 0, y: 0 }, 50, 0, 0, 10)).toEqual([])
    expect(calculateRotationalDust({ x: 0, y: 0 }, 50, 0, -2, 10)).toEqual([])
  })

  it('computes blade tip positions and centrifugal velocities for 4 blades', () => {
    const center = { x: 100, y: 100 }
    const radius = 50
    const particles = calculateRotationalDust(center, radius, 0, 4, 10, 100, 0.5)

    expect(particles).toHaveLength(4)

    // Blade 0: angle = 0 -> tip at (150, 100)
    const p0 = particles[0]
    expect(p0.tip.x).toBeCloseTo(150)
    expect(p0.tip.y).toBeCloseTo(100)
    // Tangential: (0, 1) * (10 * 50 = 500) -> (0, 500)
    // Centrifugal: (1, 0) * 100 -> (100, 0)
    // v = (100, 500)
    expect(p0.velocity.x).toBeCloseTo(100)
    expect(p0.velocity.y).toBeCloseTo(500)
    // target = tip + v * 0.5 = (150 + 50, 100 + 250) = (200, 350)
    expect(p0.target.x).toBeCloseTo(200)
    expect(p0.target.y).toBeCloseTo(350)

    // Blade 1: angle = PI/2 -> tip at (100, 150)
    const p1 = particles[1]
    expect(p1.tip.x).toBeCloseTo(100)
    expect(p1.tip.y).toBeCloseTo(150)
  })
})

describe('segmentTransform', () => {
  it('computes transform for horizontal segment', () => {
    const res = segmentTransform({ x: 0, y: 0 }, { x: 128, y: 0 }, 64)
    expect(res.midpoint).toEqual({ x: 64, y: 0 })
    expect(res.length).toBeCloseTo(128)
    expect(res.angleDeg).toBeCloseTo(0)
    expect(res.scaleX).toBeCloseTo(2.0)
  })

  it('computes transform for vertical segment', () => {
    const res = segmentTransform({ x: 50, y: 10 }, { x: 50, y: 74 }, 64)
    expect(res.midpoint).toEqual({ x: 50, y: 42 })
    expect(res.length).toBeCloseTo(64)
    expect(res.angleDeg).toBeCloseTo(90)
    expect(res.scaleX).toBeCloseTo(1.0)
  })

  it('handles zero base width safely', () => {
    const res = segmentTransform({ x: 0, y: 0 }, { x: 10, y: 10 }, 0)
    expect(res.scaleX).toBe(0)
  })
})

describe('findConstellationLinks', () => {
  const anchors: ConstellationAnchor[] = [
    { x: 100, y: 100, time: 1000, colorIndex: 1 },
    { x: 150, y: 100, time: 2000, colorIndex: 2 }, // dist 50 from (100, 100)? If newPoint is (100, 80), dist is Math.hypot(50, 20) = 53.85
    { x: 100, y: 110, time: 2500, colorIndex: 3 }, // dist 30 from (100, 80)
    { x: 500, y: 500, time: 2500, colorIndex: 4 }, // too far
  ]

  it('filters by distance and age, sorts by nearest and caps links', () => {
    const newPoint = { x: 100, y: 80 }
    const links = findConstellationLinks(newPoint, anchors, {
      minDist: 35,
      maxDist: 300,
      maxLinks: 2,
      now: 3000,
      maxAgeMs: 1500, // anchor at time 1000 is expired (now - 1000 = 2000 > 1500)
    })

    // anchor 3: dist = 30 -> less than minDist 35, filtered out
    // anchor 1: expired, filtered out
    // anchor 4: dist > 300, filtered out
    // anchor 2: dist = 53.85 -> between 35 and 300, valid
    expect(links).toHaveLength(1)
    expect(links[0].anchor.colorIndex).toBe(2)
    expect(links[0].distance).toBeCloseTo(53.85, 1)
  })

  it('returns multiple sorted links up to maxLinks', () => {
    const newPoint = { x: 0, y: 0 }
    const testAnchors: ConstellationAnchor[] = [
      { x: 0, y: 100, time: 1000, colorIndex: 1 }, // dist 100
      { x: 0, y: 50, time: 1000, colorIndex: 2 },  // dist 50
      { x: 0, y: 75, time: 1000, colorIndex: 3 },  // dist 75
    ]

    const links = findConstellationLinks(newPoint, testAnchors, {
      minDist: 20,
      maxDist: 200,
      maxLinks: 2,
      now: 1200,
      maxAgeMs: 5000,
    })

    expect(links).toHaveLength(2)
    expect(links[0].anchor.colorIndex).toBe(2) // dist 50
    expect(links[1].anchor.colorIndex).toBe(3) // dist 75
  })
})
