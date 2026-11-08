export interface Point2D {
  x: number
  y: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface Box2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface BounceRayResult {
  hitPoint: Point2D
  normal: Vector2D
  flightDistance: number
  flightDurationMs: number
  reflectedVelocity: Vector2D
}

export interface SquashStretchResult {
  scaleX: number
  scaleY: number
}

export interface RotationalDustParticle {
  tip: Point2D
  velocity: Vector2D
  target: Point2D
}

export interface SegmentTransform {
  midpoint: Point2D
  length: number
  angleRad: number
  angleDeg: number
  scaleX: number
}

export interface ConstellationAnchor {
  x: number
  y: number
  time: number
  colorIndex: number
}

export interface ConstellationLink {
  anchor: ConstellationAnchor
  distance: number
}

/**
 * Solves the parametric ray-box intersection against inner margins,
 * clamping origin within bounds and calculating the hit point, surface normal,
 * flight duration, and restitution-damped reflected velocity vector.
 */
export function calculateBounceRay(
  origin: Point2D,
  velocity: Vector2D,
  bounds: Box2D,
  radius = 0,
  restitution = 0.75,
): BounceRayResult {
  const innerMinX = bounds.minX + radius
  const innerMinY = bounds.minY + radius
  const innerMaxX = Math.max(innerMinX, bounds.maxX - radius)
  const innerMaxY = Math.max(innerMinY, bounds.maxY - radius)

  const clampedX = Math.max(innerMinX, Math.min(innerMaxX, origin.x))
  const clampedY = Math.max(innerMinY, Math.min(innerMaxY, origin.y))
  const start: Point2D = { x: clampedX, y: clampedY }

  const speed = Math.hypot(velocity.x, velocity.y)
  if (speed === 0) {
    return {
      hitPoint: start,
      normal: { x: 0, y: 0 },
      flightDistance: 0,
      flightDurationMs: 0,
      reflectedVelocity: { x: 0, y: 0 },
    }
  }

  let minT = Infinity
  let normal: Vector2D = { x: 0, y: 0 }

  if (velocity.x < 0) {
    const t = (innerMinX - start.x) / velocity.x
    if (t >= 0 && t < minT) {
      minT = t
      normal = { x: 1, y: 0 }
    }
  }

  if (velocity.x > 0) {
    const t = (innerMaxX - start.x) / velocity.x
    if (t >= 0 && t < minT) {
      minT = t
      normal = { x: -1, y: 0 }
    }
  }

  if (velocity.y < 0) {
    const t = (innerMinY - start.y) / velocity.y
    if (t >= 0) {
      if (Math.abs(t - minT) < 1e-6) {
        minT = Math.min(t, minT)
        normal = { x: normal.x / Math.SQRT2, y: 1 / Math.SQRT2 }
      } else if (t < minT) {
        minT = t
        normal = { x: 0, y: 1 }
      }
    }
  }

  if (velocity.y > 0) {
    const t = (innerMaxY - start.y) / velocity.y
    if (t >= 0) {
      if (Math.abs(t - minT) < 1e-6) {
        minT = Math.min(t, minT)
        normal = { x: normal.x / Math.SQRT2, y: -1 / Math.SQRT2 }
      } else if (t < minT) {
        minT = t
        normal = { x: 0, y: -1 }
      }
    }
  }

  const hitPoint: Point2D = {
    x: Math.max(innerMinX, Math.min(innerMaxX, start.x + velocity.x * minT)),
    y: Math.max(innerMinY, Math.min(innerMaxY, start.y + velocity.y * minT)),
  }

  const flightDistance = Math.hypot(hitPoint.x - start.x, hitPoint.y - start.y)
  const flightDurationMs = (flightDistance / speed) * 1000

  const dot = velocity.x * normal.x + velocity.y * normal.y
  const reflectedVelocity: Vector2D = {
    x: (velocity.x - 2 * dot * normal.x) * restitution,
    y: (velocity.y - 2 * dot * normal.y) * restitution,
  }

  return {
    hitPoint,
    normal,
    flightDistance,
    flightDurationMs,
    reflectedVelocity,
  }
}

/**
 * Computes squash and stretch scale factors along normal and tangential axes.
 */
export function calculateSquashStretch(
  baseScale: number,
  normal: Vector2D,
  squashFactor = 0.5,
): SquashStretchResult {
  const safeSquash = Math.max(0.01, squashFactor)
  const stretchFactor = 1 / Math.sqrt(safeSquash)

  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    return {
      scaleX: baseScale * safeSquash,
      scaleY: baseScale * stretchFactor,
    }
  }

  return {
    scaleX: baseScale * stretchFactor,
    scaleY: baseScale * safeSquash,
  }
}

/**
 * Calculates tangential and centrifugal velocity vectors and target positions
 * for dust particles escaping spinning pinwheel blade tips.
 */
export function calculateRotationalDust(
  center: Point2D,
  radius: number,
  currentAngleRad: number,
  bladeCount: number,
  angularVelocityRadS: number,
  centrifugalBoost = 120,
  flightDurationS = 0.6,
): RotationalDustParticle[] {
  const particles: RotationalDustParticle[] = []
  if (bladeCount <= 0) return particles

  const step = (2 * Math.PI) / bladeCount
  for (let i = 0; i < bladeCount; i++) {
    const theta = currentAngleRad + i * step
    const cos = Math.cos(theta)
    const sin = Math.sin(theta)

    const tip: Point2D = {
      x: center.x + radius * cos,
      y: center.y + radius * sin,
    }

    const tanSpeed = angularVelocityRadS * radius
    const vx = -sin * tanSpeed + cos * centrifugalBoost
    const vy = cos * tanSpeed + sin * centrifugalBoost

    const velocity: Vector2D = { x: vx, y: vy }
    const target: Point2D = {
      x: tip.x + vx * flightDurationS,
      y: tip.y + vy * flightDurationS,
    }

    particles.push({ tip, velocity, target })
  }

  return particles
}

/**
 * Derives midpoint, Euclidean length, rotation angle, and horizontal scale
 * for a pooled connector sprite between two points.
 */
export function segmentTransform(
  p1: Point2D,
  p2: Point2D,
  baseSegmentWidth = 64,
): SegmentTransform {
  const midpoint: Point2D = {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const length = Math.hypot(dx, dy)
  const angleRad = Math.atan2(dy, dx)
  const angleDeg = (angleRad * 180) / Math.PI
  const scaleX = baseSegmentWidth > 0 ? length / baseSegmentWidth : 0

  return {
    midpoint,
    length,
    angleRad,
    angleDeg,
    scaleX,
  }
}

/**
 * Filters recent constellation star anchors within distance and age limits,
 * sorted by proximity up to maxLinks.
 */
export function findConstellationLinks(
  newPoint: Point2D,
  candidates: ConstellationAnchor[],
  options: {
    minDist: number
    maxDist: number
    maxLinks: number
    now: number
    maxAgeMs: number
  },
): ConstellationLink[] {
  const { minDist, maxDist, maxLinks, now, maxAgeMs } = options
  const eligible: ConstellationLink[] = []

  for (const anchor of candidates) {
    if (now - anchor.time > maxAgeMs) continue
    const distance = Math.hypot(anchor.x - newPoint.x, anchor.y - newPoint.y)
    if (distance >= minDist && distance <= maxDist) {
      eligible.push({ anchor, distance })
    }
  }

  eligible.sort((a, b) => a.distance - b.distance)
  return eligible.slice(0, maxLinks)
}
