import { describe, expect, it } from 'vitest'
import { computeSwitcherLayout, switcherLeftEdge } from './switcherLayout'

describe('computeSwitcherLayout', () => {
  it('uses full-size spacing on desktop viewports', () => {
    const layout = computeSwitcherLayout(1280, 4)
    expect(layout.radius).toBe(46)
    expect(layout.spacing).toBe(108)
    expect(layout.y).toBe(72)
    expect(layout.centers).toEqual([884, 992, 1100, 1208])
    expect(switcherLeftEdge(1280, 4)).toBe(838)
  })

  it('uses compact phone spacing on 390px viewports', () => {
    const layout = computeSwitcherLayout(390, 4)
    expect(layout.radius).toBe(34)
    expect(layout.spacing).toBe(86)
    expect(layout.y).toBe(60)
    expect(layout.centers).toEqual([78, 164, 250, 336])
  })

  it('fits all four buttons inside a 320px viewport with and without safe-area insets', () => {
    for (const inset of [
      { top: 0, right: 0, left: 0 },
      { top: 44, right: 16, left: 16 },
    ]) {
      const layout = computeSwitcherLayout(320, 4, inset)
      expect(layout.centers[0] - layout.radius).toBeGreaterThanOrEqual(inset.left)
      expect(layout.centers[3] + layout.radius).toBeLessThanOrEqual(320 - inset.right)
      expect(layout.spacing).toBeGreaterThanOrEqual(layout.radius * 2)
    }
  })

  it('shrinks radius cleanly on extremely tight widths and handles 0 or 1 buttons', () => {
    const tight = computeSwitcherLayout(180, 4)
    expect(tight.centers[0] - tight.radius).toBeGreaterThanOrEqual(0)
    expect(tight.centers[3] + tight.radius).toBeLessThanOrEqual(180)

    const single = computeSwitcherLayout(40, 1)
    expect(single.centers).toHaveLength(1)
    expect(single.spacing).toBe(0)

    const empty = computeSwitcherLayout(390, 0, { top: 0, right: 12 })
    expect(empty.centers).toEqual([])
    expect(switcherLeftEdge(390, 0, { top: 0, right: 12 })).toBe(378)
  })
})
