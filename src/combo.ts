/**
 * Combo tracking, kept free of Phaser and WebAudio so it can be unit-tested.
 *
 * Rapid presses inside a sliding window build a streak. Each step of the streak
 * maps to the next note of an ascending pentatonic arpeggio, and the last step
 * is the "peak" that triggers the celebration.
 */

export interface ComboConfig {
  /** Sliding window in ms; a press within it of the previous one advances the combo. */
  windowMs: number
  /** Hits needed to reach the crescendo peak. */
  maxCombo: number
  /** Presses closer together than this are treated as jitter and do not advance. */
  minIntervalMs?: number
}

export interface ComboHit {
  /** Consecutive hit count, 1-indexed (1..maxCombo). */
  count: number
  /** Arpeggio step, 0-indexed (0..maxCombo - 1). */
  step: number
  /** True only on the hit that reaches `maxCombo`. */
  isPeak: boolean
  /** Progress toward the peak, 1/maxCombo..1. Scales visual juice. */
  ratio: number
  /** True when this hit started a new streak (fresh, expired or after a peak). */
  isFirst: boolean
}

export interface ComboState {
  count: number
  step: number
  ratio: number
  active: boolean
}

/** What a toy sees when nothing is tracking a streak (puzzle gardens, tests). */
export const IDLE_HIT: ComboHit = { count: 1, step: 0, isPeak: false, ratio: 0, isFirst: true }

const DEFAULT_MIN_INTERVAL_MS = 30

export class ComboTracker {
  private count = 0
  private lastTime: number | null = null

  constructor(private readonly config: ComboConfig) {}

  /** Register a press at `now` (ms, e.g. performance.now()) and advance the streak. */
  hit(now: number): ComboHit {
    const last = this.lastTime
    const minInterval = this.config.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS
    if (last !== null && this.count > 0 && now - last >= 0 && now - last < minInterval) {
      // Jitter: report the current position but never celebrate twice.
      return { ...this.snapshot(false), isPeak: false }
    }

    const expired = last === null || now - last > this.config.windowMs
    this.lastTime = now
    if (expired || this.count >= this.config.maxCombo) {
      this.count = 1
      return this.snapshot(true)
    }
    this.count++
    return this.snapshot(false)
  }

  /** Where the streak stands at `now`, without advancing it. */
  getState(now: number): ComboState {
    if (this.lastTime === null || this.count === 0 || now - this.lastTime > this.config.windowMs) {
      return { count: 0, step: 0, ratio: 0, active: false }
    }
    return {
      count: this.count,
      step: this.count - 1,
      ratio: this.count / this.config.maxCombo,
      active: true,
    }
  }

  /** Forget the streak (mode or mood change, grown-up panel, new player). */
  reset(): void {
    this.count = 0
    this.lastTime = null
  }

  private snapshot(isFirst: boolean): ComboHit {
    return {
      count: this.count,
      step: this.count - 1,
      isPeak: this.count >= this.config.maxCombo,
      ratio: this.count / this.config.maxCombo,
      isFirst,
    }
  }
}

/** Map an arpeggio step to a note-table index, wrapped so any integer is valid. */
export function comboNoteIndex(step: number, baseIndex = 0, noteCount = 15): number {
  return (((baseIndex + step) % noteCount) + noteCount) % noteCount
}

/**
 * Note-table indices for a warm chord: root, major third, fifth and octave of
 * the pentatonic scale (table offsets 0, 2, 3, 5). Four voices, all consonant.
 */
export function comboChordIndices(baseIndex = 0): number[] {
  return [baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 5]
}
