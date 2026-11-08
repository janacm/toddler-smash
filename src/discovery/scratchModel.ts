import { CONFIG } from '../config'
import { SCRATCH_CARD_IDS, type ScratchCardId, type ScratchCell } from './types'

export class ScratchGrid {
  readonly cols: number
  readonly rows: number
  readonly totalCells: number
  private readonly cells: Uint8Array
  private _clearedCount = 0

  constructor(cols: number = CONFIG.discovery.gridCols, rows: number = CONFIG.discovery.gridRows) {
    this.cols = Math.max(1, cols)
    this.rows = Math.max(1, rows)
    this.totalCells = this.cols * this.rows
    this.cells = new Uint8Array(this.totalCells)
  }

  get clearedCount(): number {
    return this._clearedCount
  }

  get coverage(): number {
    return this._clearedCount / this.totalCells
  }

  isCleared(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false
    return this.cells[row * this.cols + col] === 1
  }

  clearedCells(): ScratchCell[] {
    const list: ScratchCell[] = []
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.cells[r * this.cols + c] === 1) {
          list.push({ col: c, row: r })
        }
      }
    }
    return list
  }

  scratchPoint(nx: number, ny: number, rx: number, ry: number, tolerance = 0.25): number {
    if (rx <= 0 || ry <= 0) return 0
    const colMin = Math.max(0, Math.floor((nx - rx) * this.cols))
    const colMax = Math.min(this.cols - 1, Math.floor((nx + rx) * this.cols))
    const rowMin = Math.max(0, Math.floor((ny - ry) * this.rows))
    const rowMax = Math.min(this.rows - 1, Math.floor((ny + ry) * this.rows))

    if (colMin > colMax || rowMin > rowMax) return 0

    let newlyCleared = 0
    const tolSq = 1 + tolerance

    for (let r = rowMin; r <= rowMax; r++) {
      const cellY = (r + 0.5) / this.rows
      const dy = (cellY - ny) / ry
      const dySq = dy * dy
      if (dySq > tolSq) continue

      for (let c = colMin; c <= colMax; c++) {
        const idx = r * this.cols + c
        if (this.cells[idx] === 1) continue

        const cellX = (c + 0.5) / this.cols
        const dx = (cellX - nx) / rx
        if (dx * dx + dySq <= tolSq) {
          this.cells[idx] = 1
          this._clearedCount++
          newlyCleared++
        }
      }
    }

    return newlyCleared
  }

  scratchSegment(
    nx1: number,
    ny1: number,
    nx2: number,
    ny2: number,
    rx: number,
    ry: number,
    tolerance = 0.25,
  ): number {
    if (rx <= 0 || ry <= 0) return 0
    const dist = Math.hypot(nx2 - nx1, ny2 - ny1)
    const step = Math.max(0.001, Math.min(rx, ry) * 0.5)
    const steps = Math.max(1, Math.ceil(dist / step))

    let newlyCleared = 0
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const nx = nx1 + (nx2 - nx1) * t
      const ny = ny1 + (ny2 - ny1) * t
      newlyCleared += this.scratchPoint(nx, ny, rx, ry, tolerance)
    }

    return newlyCleared
  }

  reset(): void {
    this.cells.fill(0)
    this._clearedCount = 0
  }
}

export class ScratchCardModel {
  readonly playlist: readonly ScratchCardId[]
  readonly threshold: number
  readonly grid: ScratchGrid
  private _currentIndex = 0

  constructor(
    playlist: readonly ScratchCardId[] = SCRATCH_CARD_IDS,
    threshold: number = CONFIG.discovery.coverageThreshold,
    cols: number = CONFIG.discovery.gridCols,
    rows: number = CONFIG.discovery.gridRows,
  ) {
    this.playlist = playlist.length > 0 ? playlist : SCRATCH_CARD_IDS
    this.threshold = threshold
    this.grid = new ScratchGrid(cols, rows)
  }

  get cardId(): ScratchCardId {
    return this.playlist[this._currentIndex % this.playlist.length]
  }

  get currentIndex(): number {
    return this._currentIndex
  }

  get coverage(): number {
    return this.grid.coverage
  }

  isComplete(): boolean {
    return this.grid.coverage >= this.threshold
  }

  advance(): ScratchCardId {
    this._currentIndex = (this._currentIndex + 1) % this.playlist.length
    this.grid.reset()
    return this.cardId
  }

  reset(): void {
    this._currentIndex = 0
    this.grid.reset()
  }

  scratchPoint(nx: number, ny: number, rx: number, ry: number, tolerance?: number): number {
    return this.grid.scratchPoint(nx, ny, rx, ry, tolerance)
  }

  scratchSegment(
    nx1: number,
    ny1: number,
    nx2: number,
    ny2: number,
    rx: number,
    ry: number,
    tolerance?: number,
  ): number {
    return this.grid.scratchSegment(nx1, ny1, nx2, ny2, rx, ry, tolerance)
  }
}
