import { describe, expect, it } from 'vitest'
import { ComboTracker, comboChordIndices, comboNoteIndex } from './combo'
import { CONFIG } from './config'

const config = { windowMs: 900, maxCombo: 6, minIntervalMs: 35 }
const tracker = () => new ComboTracker(config)

describe('ComboTracker', () => {
  it('starts a streak on the first hit, even at time zero', () => {
    expect(tracker().hit(0)).toEqual({ count: 1, step: 0, isPeak: false, ratio: 1 / 6, isFirst: true })
  })

  it('advances step by step within the window and peaks at maxCombo', () => {
    const t = tracker()
    const hits = [0, 100, 200, 300, 400, 500].map((now) => t.hit(now))
    expect(hits.map((h) => h.step)).toEqual([0, 1, 2, 3, 4, 5])
    expect(hits.map((h) => h.isPeak)).toEqual([false, false, false, false, false, true])
    expect(hits.map((h) => h.isFirst)).toEqual([true, false, false, false, false, false])
    expect(hits[5].ratio).toBe(1)
  })

  it('starts over on the hit after a peak', () => {
    const t = tracker()
    for (let i = 0; i < 6; i++) t.hit(i * 100)
    expect(t.hit(700)).toMatchObject({ count: 1, step: 0, isPeak: false, isFirst: true })
  })

  it('starts over when the window has expired', () => {
    const t = tracker()
    t.hit(0)
    t.hit(100)
    expect(t.hit(100 + 901)).toMatchObject({ count: 1, isFirst: true })
    expect(t.hit(1001 + 900)).toMatchObject({ count: 2, isFirst: false })
  })

  it('treats a press exactly at the window edge as still in the streak', () => {
    const t = tracker()
    t.hit(0)
    expect(t.hit(900).count).toBe(2)
  })

  it('ignores micro-jitter without advancing or re-celebrating', () => {
    const t = tracker()
    t.hit(1000)
    expect(t.hit(1010)).toMatchObject({ count: 1, step: 0, isFirst: false, isPeak: false })
    expect(t.hit(1100).count).toBe(2)

    const peak = tracker()
    for (let i = 0; i < 6; i++) peak.hit(i * 100)
    expect(peak.hit(500 + 10)).toMatchObject({ count: 6, isPeak: false })
  })

  it('uses a default jitter interval when none is configured', () => {
    const t = new ComboTracker({ windowMs: 900, maxCombo: 6 })
    t.hit(100)
    expect(t.hit(120).count).toBe(1)
    expect(t.hit(140).count).toBe(2)
  })

  it('does not stall if the clock goes backwards', () => {
    const t = tracker()
    t.hit(1000)
    expect(t.hit(500).count).toBe(2)
  })

  it('reset forgets the streak immediately', () => {
    const t = tracker()
    t.hit(0)
    t.hit(100)
    t.reset()
    expect(t.getState(150)).toEqual({ count: 0, step: 0, ratio: 0, active: false })
    expect(t.hit(150)).toMatchObject({ count: 1, isFirst: true })
  })

  it('getState reports an active streak, then goes inactive after the window', () => {
    const t = tracker()
    expect(t.getState(0).active).toBe(false)
    t.hit(0)
    t.hit(100)
    t.hit(200)
    expect(t.getState(300)).toEqual({ count: 3, step: 2, ratio: 0.5, active: true })
    expect(t.getState(200 + 901).active).toBe(false)
  })
})

describe('comboNoteIndex', () => {
  it('ascends monotonically across the steps of a streak', () => {
    const notes = Array.from({ length: CONFIG.combo.maxCombo }, (_, step) => comboNoteIndex(step))
    expect(notes).toEqual([...notes].sort((a, b) => a - b))
    expect(new Set(notes).size).toBe(notes.length)
  })

  it('wraps into the note table for any integer', () => {
    expect(comboNoteIndex(14)).toBe(14)
    expect(comboNoteIndex(15)).toBe(0)
    expect(comboNoteIndex(-1)).toBe(14)
    expect(comboNoteIndex(2, 14)).toBe(1)
    expect(comboNoteIndex(3, 0, 5)).toBe(3)
  })
})

describe('comboChordIndices', () => {
  it('is root, third, fifth and octave of the pentatonic scale', () => {
    const { scaleSemitones } = CONFIG.audio
    const semis = comboChordIndices(0).map(
      (i) => Math.floor(i / scaleSemitones.length) * 12 + scaleSemitones[i % scaleSemitones.length],
    )
    expect(semis).toEqual([0, 4, 7, 12])
  })

  it('stays four voices and transposes with the base', () => {
    expect(comboChordIndices()).toHaveLength(4)
    expect(comboChordIndices(5)).toEqual([5, 7, 8, 10])
  })
})
