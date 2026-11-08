import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { brushPx, cardRect, noteForY, scratchRadiusPx, strokePoints } from './drawingMath'

describe('brushPx', () => {
  it('scales with the short side of the screen', () => {
    expect(brushPx(1000, 800)).toBeCloseTo(800 * CONFIG.drawing.brushFrac)
    expect(brushPx(800, 1000)).toBeCloseTo(800 * CONFIG.drawing.brushFrac)
  })

  it('never goes below the minimum', () => {
    expect(brushPx(100, 100)).toBe(CONFIG.drawing.minBrushPx)
  })
})

describe('strokePoints', () => {
  it('spaces points no further apart than the step and ends on the target', () => {
    const pts = strokePoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 10)
    expect(pts).toHaveLength(10)
    expect(pts.at(-1)).toEqual({ x: 100, y: 0 })
    expect(pts[0].x).toBeCloseTo(10)
  })

  it('returns nothing for no movement or bad input', () => {
    expect(strokePoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 10)).toEqual([])
    expect(strokePoints({ x: 0, y: 0 }, { x: NaN, y: 0 }, 10)).toEqual([])
    expect(strokePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 0)).toEqual([])
  })

  it('caps the number of points for huge jumps', () => {
    expect(strokePoints({ x: 0, y: 0 }, { x: 1e6, y: 0 }, 1, 50)).toHaveLength(50)
  })
})

describe('noteForY', () => {
  const top = CONFIG.audio.scaleSemitones.length * CONFIG.audio.octaves - 1

  it('plays higher notes higher on the screen', () => {
    expect(noteForY(0, 800)).toBe(top)
    expect(noteForY(800, 800)).toBe(0)
    expect(noteForY(200, 800)).toBeGreaterThan(noteForY(600, 800))
  })

  it('clamps off-screen and bad values', () => {
    expect(noteForY(-50, 800)).toBe(top)
    expect(noteForY(5000, 800)).toBe(0)
    expect(noteForY(NaN, 800)).toBe(0)
    expect(noteForY(10, 0)).toBe(0)
  })
})

describe('cardRect', () => {
  it('centers the card within the available area', () => {
    const rect = cardRect(1000, 800, 80)
    expect(rect.x).toBeGreaterThan(0)
    expect(rect.y).toBeGreaterThan(0)
    expect(rect.width).toBeLessThanOrEqual(520)
    expect(rect.height).toBeLessThanOrEqual(380)
    expect(rect.x + rect.width / 2).toBeCloseTo(500, 0)
    expect(rect.y + rect.height / 2).toBeCloseTo(360, 0)
  })

  it('preserves the 520:380 aspect ratio', () => {
    const rect = cardRect(400, 700)
    expect(rect.width / rect.height).toBeCloseTo(520 / 380, 1)
  })

  it('handles small viewports safely', () => {
    const rect = cardRect(200, 150, 50)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
  })
})

describe('scratchRadiusPx', () => {
  it('scales with brush width with a reasonable floor', () => {
    expect(scratchRadiusPx(10)).toBe(16)
    expect(scratchRadiusPx(20)).toBe(30)
    expect(scratchRadiusPx(30)).toBe(45)
  })
})

