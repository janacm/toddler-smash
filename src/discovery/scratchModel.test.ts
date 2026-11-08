import { describe, expect, it } from 'vitest'
import { ScratchCardModel, ScratchGrid } from './scratchModel'
import { SCRATCH_CARD_IDS } from './types'

describe('ScratchGrid', () => {
  it('initializes with correct columns, rows, and empty coverage', () => {
    const grid = new ScratchGrid(10, 8)
    expect(grid.cols).toBe(10)
    expect(grid.rows).toBe(8)
    expect(grid.totalCells).toBe(80)
    expect(grid.clearedCount).toBe(0)
    expect(grid.coverage).toBe(0)
    expect(grid.clearedCells()).toEqual([])
  })

  it('scratchPoint marks intersecting cells and calculates coverage', () => {
    const grid = new ScratchGrid(10, 10)
    const cleared = grid.scratchPoint(0.5, 0.5, 0.15, 0.15)
    expect(cleared).toBeGreaterThan(0)
    expect(grid.clearedCount).toBe(cleared)
    expect(grid.coverage).toBeCloseTo(cleared / 100)
    expect(grid.isCleared(5, 5)).toBe(true)

    // Re-scratching already cleared cells returns 0 and does not double-count
    const rescratched = grid.scratchPoint(0.5, 0.5, 0.15, 0.15)
    expect(rescratched).toBe(0)
    expect(grid.clearedCount).toBe(cleared)
  })

  it('scratchPoint returns 0 for non-positive radii or completely off-grid coordinates', () => {
    const grid = new ScratchGrid(10, 10)
    expect(grid.scratchPoint(0.5, 0.5, 0, 0.1)).toBe(0)
    expect(grid.scratchPoint(0.5, 0.5, 0.1, -0.1)).toBe(0)
    expect(grid.scratchPoint(5.0, 5.0, 0.1, 0.1)).toBe(0)
    expect(grid.scratchPoint(-5.0, -5.0, 0.1, 0.1)).toBe(0)
  })

  it('isCleared checks boundary conditions properly', () => {
    const grid = new ScratchGrid(4, 4)
    expect(grid.isCleared(-1, 0)).toBe(false)
    expect(grid.isCleared(0, -1)).toBe(false)
    expect(grid.isCleared(4, 0)).toBe(false)
    expect(grid.isCleared(0, 4)).toBe(false)
    expect(grid.isCleared(1, 1)).toBe(false)
  })

  it('clearedCells accurately reports all cleared cells', () => {
    const grid = new ScratchGrid(4, 4)
    grid.scratchPoint(0.1, 0.1, 0.15, 0.15)
    const cells = grid.clearedCells()
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(grid.isCleared(cell.col, cell.row)).toBe(true)
    }
  })

  it('scratchSegment connects points smoothly without leaving gaps', () => {
    const grid = new ScratchGrid(20, 20)
    const cleared = grid.scratchSegment(0.1, 0.5, 0.9, 0.5, 0.08, 0.08)
    expect(cleared).toBeGreaterThan(0)
    // Multiple horizontal columns in the middle should be cleared
    for (let c = 2; c <= 17; c++) {
      expect(grid.isCleared(c, 10)).toBe(true)
    }
  })

  it('scratchSegment handles zero length segment and non-positive radii', () => {
    const grid = new ScratchGrid(10, 10)
    expect(grid.scratchSegment(0.5, 0.5, 0.5, 0.5, 0, 0.1)).toBe(0)
    const cleared = grid.scratchSegment(0.5, 0.5, 0.5, 0.5, 0.1, 0.1)
    expect(cleared).toBeGreaterThan(0)
  })

  it('reset clears all cells and resets coverage to 0', () => {
    const grid = new ScratchGrid(10, 10)
    grid.scratchPoint(0.5, 0.5, 0.3, 0.3)
    expect(grid.clearedCount).toBeGreaterThan(0)
    grid.reset()
    expect(grid.clearedCount).toBe(0)
    expect(grid.coverage).toBe(0)
    expect(grid.clearedCells()).toEqual([])
    expect(grid.isCleared(5, 5)).toBe(false)
  })
})

describe('ScratchCardModel', () => {
  it('initializes with default playlist and starts on first card', () => {
    const model = new ScratchCardModel()
    expect(model.playlist).toEqual(SCRATCH_CARD_IDS)
    expect(model.cardId).toBe('dino')
    expect(model.currentIndex).toBe(0)
    expect(model.coverage).toBe(0)
    expect(model.isComplete()).toBe(false)
  })

  it('accepts custom playlist or falls back when empty', () => {
    const custom = new ScratchCardModel(['sky', 'shark'])
    expect(custom.playlist).toEqual(['sky', 'shark'])
    expect(custom.cardId).toBe('sky')

    const empty = new ScratchCardModel([])
    expect(empty.playlist).toEqual(SCRATCH_CARD_IDS)
  })

  it('delegates scratching to internal grid', () => {
    const model = new ScratchCardModel(['dino'], 0.5, 10, 10)
    const pCleared = model.scratchPoint(0.5, 0.5, 0.15, 0.15)
    expect(pCleared).toBeGreaterThan(0)
    expect(model.coverage).toBeGreaterThan(0)

    const sCleared = model.scratchSegment(0.1, 0.1, 0.3, 0.1, 0.1, 0.1)
    expect(sCleared).toBeGreaterThan(0)
  })

  it('isComplete reflects coverage against threshold', () => {
    const model = new ScratchCardModel(['dino'], 0.4, 4, 4)
    expect(model.isComplete()).toBe(false)
    // Clear entire card
    model.scratchSegment(0, 0, 1, 1, 0.9, 0.9)
    expect(model.coverage).toBeGreaterThanOrEqual(0.4)
    expect(model.isComplete()).toBe(true)
  })

  it('advance moves to next card in playlist and resets grid', () => {
    const model = new ScratchCardModel(['dino', 'shark', 'sky'])
    model.scratchPoint(0.5, 0.5, 0.2, 0.2)
    expect(model.coverage).toBeGreaterThan(0)

    const next1 = model.advance()
    expect(next1).toBe('shark')
    expect(model.cardId).toBe('shark')
    expect(model.currentIndex).toBe(1)
    expect(model.coverage).toBe(0)

    const next2 = model.advance()
    expect(next2).toBe('sky')
    expect(model.cardId).toBe('sky')

    const next3 = model.advance()
    expect(next3).toBe('dino')
    expect(model.cardId).toBe('dino')
  })

  it('reset returns to the first card and resets coverage', () => {
    const model = new ScratchCardModel(['dino', 'shark', 'sky'])
    model.advance()
    model.scratchPoint(0.5, 0.5, 0.2, 0.2)
    expect(model.currentIndex).toBe(1)
    expect(model.coverage).toBeGreaterThan(0)

    model.reset()
    expect(model.currentIndex).toBe(0)
    expect(model.cardId).toBe('dino')
    expect(model.coverage).toBe(0)
  })
})
