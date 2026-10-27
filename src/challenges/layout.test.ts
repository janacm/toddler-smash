import { describe, expect, it } from 'vitest'
import { challengeLayout, crossedNodes, distanceToSegment, hit, moveNode } from './layout'
import type { GameId } from './model'

const games: readonly GameId[] = ['smash', 'piano', 'drawing']

describe('challengeLayout', () => {
  it.each(games)('gives %s the same row-major grid used by choices and entrance perches', game => {
    const layout = challengeLayout(1280, 720, game)
    expect(layout.nodes).toHaveLength(9)
    expect(layout.choices).toEqual(layout.nodes.slice(3, 6))
    expect(layout.perches).toEqual([layout.nodes[0], layout.nodes[2], layout.nodes[6]])
    for (let row = 0; row < 3; row++) {
      const [left, centre, right] = layout.nodes.slice(row * 3, row * 3 + 3)
      expect(left.y).toBe(centre.y)
      expect(centre.y).toBe(right.y)
      expect(centre.x - left.x).toBeCloseTo(right.x - centre.x)
      expect(left.x).toBeLessThan(centre.x)
      expect(centre.x).toBeLessThan(right.x)
    }
    expect(layout.nodes[3].y - layout.nodes[0].y).toBeCloseTo(layout.nodes[6].y - layout.nodes[3].y)
    expect(layout.promptY).toBeLessThan(layout.nodes[0].y)
    expect(layout.back.x).toBeLessThan(layout.nodes[0].x)
    expect(layout.replay.x).toBeGreaterThan(layout.nodes[2].x)
    expect(layout.radius).toBe(34)
  })

  it('keeps the Piano challenge above the free-play keyboard', () => {
    const piano = challengeLayout(1280, 720, 'piano')
    const smash = challengeLayout(1280, 720, 'smash')
    expect(piano.nodes[8].y).toBeLessThan(720 * 0.54)
    expect(piano.nodes[8].y).toBeLessThan(smash.nodes[8].y)
  })

  it.each(games)('fits %s on a compact landscape screen without overlapping its controls', game => {
    const layout = challengeLayout(844, 390, game)
    expect(layout.promptY).toBe(125)
    expect(layout.back.y).toBe(128)
    expect(layout.replay.y).toBe(layout.back.y)
    for (const node of layout.nodes) {
      expect(node.y).toBeGreaterThan(layout.back.y + layout.radius)
      expect(node.y + layout.radius).toBeLessThanOrEqual(390)
      expect(node.x - layout.radius).toBeGreaterThan(0)
      expect(node.x + layout.radius).toBeLessThan(844)
    }
  })

  it('respects a phone notch and home-indicator insets', () => {
    const inset = { top: 44, right: 13, bottom: 34, left: 7 }
    const layout = challengeLayout(390, 844, 'drawing', inset)
    expect(layout.back).toEqual({ x: 47, y: 196 })
    expect(layout.replay).toEqual({ x: 337, y: 196 })
    expect(layout.nodes[0].y).toBeGreaterThanOrEqual(inset.top + 230)
    for (const node of layout.nodes) {
      expect(node.x - layout.radius).toBeGreaterThan(inset.left)
      expect(node.x + layout.radius).toBeLessThan(390 - inset.right)
      expect(node.y + layout.radius).toBeLessThan(844 - inset.bottom)
    }
  })

  it('uses the available height when an inset reduces the Drawing canvas', () => {
    const layout = challengeLayout(1000, 600, 'drawing', { top: 0, right: 0, bottom: 100, left: 0 })
    expect(layout.nodes[8].y).toBe(400)
  })

  it('retains usable targets on narrow screens and caps them on large screens', () => {
    expect(challengeLayout(200, 700, 'drawing').radius).toBe(22)
    expect(challengeLayout(300, 700, 'drawing').radius).toBeCloseTo(180 / 7)
    expect(challengeLayout(1600, 900, 'drawing').radius).toBe(34)
  })

  it('keeps separate rows when the Piano panel has little vertical room', () => {
    const layout = challengeLayout(800, 500, 'piano')
    expect(layout.nodes[3].y - layout.nodes[0].y).toBe(30)
    expect(layout.nodes[6].y - layout.nodes[3].y).toBe(30)
  })
})

describe('moveNode', () => {
  it.each([
    ['ArrowLeft', [0, 0, 1, 3, 3, 4, 6, 6, 7]],
    ['ArrowRight', [1, 2, 2, 4, 5, 5, 7, 8, 8]],
    ['ArrowUp', [0, 1, 2, 0, 1, 2, 3, 4, 5]],
    ['ArrowDown', [3, 4, 5, 6, 7, 8, 6, 7, 8]],
  ] as const)('%s moves one adjacent node and stops at each edge', (key, expected) => {
    expect(Array.from({ length: 9 }, (_, node) => moveNode(node, key))).toEqual(expected)
  })

  it('leaves the cursor in place for unrelated keys', () => {
    expect(moveNode(4, 'Space')).toBe(4)
    expect(moveNode(0, 'Escape')).toBe(0)
  })
})

describe('distanceToSegment', () => {
  const from = { x: 0, y: 0 }, to = { x: 10, y: 0 }

  it('measures perpendicular distance to the interior of a segment', () => {
    expect(distanceToSegment({ x: 4, y: 3 }, from, to)).toBe(3)
    expect(distanceToSegment({ x: 4, y: -3 }, from, to)).toBe(3)
    expect(distanceToSegment({ x: 4, y: 0 }, from, to)).toBe(0)
    expect(distanceToSegment({ x: 4, y: 3 }, to, from)).toBe(3)
  })

  it('projects onto diagonal segments', () => {
    expect(distanceToSegment({ x: 0, y: 2 }, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeCloseTo(Math.SQRT2)
  })

  it('clamps the projection to the endpoints', () => {
    expect(distanceToSegment({ x: -3, y: 4 }, from, to)).toBe(5)
    expect(distanceToSegment({ x: 13, y: 4 }, from, to)).toBe(5)
    expect(distanceToSegment(from, from, to)).toBe(0)
    expect(distanceToSegment(to, from, to)).toBe(0)
  })

  it('uses point distance for a zero-length segment', () => {
    const point = { x: 3, y: 4 }
    expect(distanceToSegment({ x: 0, y: 0 }, point, point)).toBe(5)
    expect(distanceToSegment(point, point, point)).toBe(0)
  })
})

describe('crossedNodes', () => {
  const nodes = Array.from({ length: 9 }, (_, i) => ({ x: (i % 3) * 100, y: Math.floor(i / 3) * 100 }))

  it('recognizes coalesced movement through a row in travel order', () => {
    expect(crossedNodes(nodes[3], nodes[5], nodes, 20)).toEqual([3, 4, 5])
    expect(crossedNodes(nodes[5], nodes[3], nodes, 20)).toEqual([5, 4, 3])
  })

  it('recognizes a diagonal crossing and excludes nodes outside its corridor', () => {
    expect(crossedNodes(nodes[0], nodes[8], nodes, 20)).toEqual([0, 4, 8])
    expect(crossedNodes(nodes[8], nodes[0], nodes, 20)).toEqual([8, 4, 0])
  })

  it('recognizes only nearby waypoints for a stationary pointer', () => {
    expect(crossedNodes(nodes[4], nodes[4], nodes, 20)).toEqual([4])
    expect(crossedNodes({ x: 50, y: 50 }, { x: 50, y: 50 }, nodes, 20)).toEqual([])
  })

  it('includes a waypoint on the radius boundary and excludes one just outside', () => {
    const points = [{ x: 40, y: 20 }, { x: 60, y: 20.01 }, { x: 200, y: 0 }]
    expect(crossedNodes({ x: 0, y: 0 }, { x: 100, y: 0 }, points, 20)).toEqual([0])
    expect(crossedNodes(nodes[0], nodes[8], [], 20)).toEqual([])
  })
})

describe('hit', () => {
  const target = { x: 10, y: 10 }

  it('accepts the target centre and the circular boundary', () => {
    expect(hit(target, target, 0)).toBe(true)
    expect(hit({ x: 13, y: 14 }, target, 5)).toBe(true)
    expect(hit({ x: 7, y: 6 }, target, 5)).toBe(true)
  })

  it('rejects points outside the circle even when inside its bounding square', () => {
    expect(hit({ x: 13.01, y: 14 }, target, 5)).toBe(false)
    expect(hit({ x: 15, y: 15 }, target, 5)).toBe(false)
  })
})
