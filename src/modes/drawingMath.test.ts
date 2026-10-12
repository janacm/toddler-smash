import { describe, expect, it } from 'vitest'
import { CONFIG } from '../config'
import { brushPx, noteForY, strokePoints } from './drawingMath'

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
