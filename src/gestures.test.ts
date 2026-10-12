import { describe, expect, it } from 'vitest'
import { cornerSize, isDiagonalCornerHold } from './gestures'

const W = 390
const H = 844
const size = cornerSize(W, H)

describe('isDiagonalCornerHold', () => {
  it('fires with one finger in the top-left and one in the bottom-right', () => {
    expect(isDiagonalCornerHold([{ x: 10, y: 10 }, { x: W - 10, y: H - 10 }], W, H)).toBe(true)
  })

  it('does not care about finger order or extra fingers', () => {
    const points = [{ x: 200, y: 400 }, { x: W - 5, y: H - 5 }, { x: 150, y: 300 }, { x: 5, y: 5 }]
    expect(isDiagonalCornerHold(points, W, H)).toBe(true)
  })

  it('needs both corners', () => {
    expect(isDiagonalCornerHold([{ x: 10, y: 10 }], W, H)).toBe(false)
    expect(isDiagonalCornerHold([{ x: W - 10, y: H - 10 }], W, H)).toBe(false)
    expect(isDiagonalCornerHold([], W, H)).toBe(false)
  })

  it('ignores the other diagonal, which a palm along one side could cover', () => {
    expect(isDiagonalCornerHold([{ x: W - 10, y: 10 }, { x: 10, y: H - 10 }], W, H)).toBe(false)
  })

  it('ignores a whole palm along the bottom edge', () => {
    const palm = Array.from({ length: 8 }, (_, i) => ({ x: (W / 8) * i + 5, y: H - 10 }))
    expect(isDiagonalCornerHold(palm, W, H)).toBe(false)
  })

  it('treats the corner zone edge as inside', () => {
    expect(isDiagonalCornerHold([{ x: size, y: size }, { x: W - size, y: H - size }], W, H)).toBe(true)
    expect(isDiagonalCornerHold([{ x: size + 1, y: size }, { x: W - size, y: H - size }], W, H)).toBe(false)
  })
})

describe('cornerSize', () => {
  it('scales with the short edge between 56 and 110 px', () => {
    expect(cornerSize(320, 480)).toBe(56)
    expect(cornerSize(390, 844)).toBe(56)
    expect(cornerSize(1024, 768)).toBeCloseTo(107.52)
    expect(cornerSize(3840, 2160)).toBe(110)
  })
})
