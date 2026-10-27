import { describe, expect, it } from 'vitest'
import { CONFIG, type MoodName } from './config'

const moods = Object.keys(CONFIG.moods) as MoodName[]

/** Keys the grown-up panel already uses for controls other than a mood. */
const RESERVED_PANEL_KEYS = ['c', 'f', 'q', 'r', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

describe('CONFIG.moods', () => {
  it('every mood defines the same fields', () => {
    const shape = (name: MoodName) => ({
      top: Object.keys(CONFIG.moods[name]).sort(),
      audio: Object.keys(CONFIG.moods[name].audio).sort(),
    })
    for (const name of moods) expect(shape(name), name).toEqual(shape('daytime'))
  })

  it('panel keys are single letters, unique, and not used by other panel controls', () => {
    const keys = moods.map((m) => CONFIG.moods[m].panelKey.toLowerCase())
    for (const key of keys) {
      expect(key).toMatch(/^[a-z]$/)
      expect(RESERVED_PANEL_KEYS).not.toContain(key)
    }
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps every mood well below clipping volume', () => {
    for (const name of moods) {
      expect(CONFIG.moods[name].audio.volume, name).toBeGreaterThan(0)
      expect(CONFIG.moods[name].audio.volume, name).toBeLessThanOrEqual(0.3)
    }
  })

  it('bedtime is calmer than daytime', () => {
    const { daytime, bedtime } = CONFIG.moods
    expect(bedtime.timeScale).toBeLessThan(daytime.timeScale)
    expect(bedtime.audio.volume).toBeLessThan(daytime.audio.volume)
    expect(bedtime.minSpawnIntervalMs).toBeGreaterThan(daytime.minSpawnIntervalMs)
  })

  it('every mood has a palette to draw with', () => {
    for (const name of moods) expect(CONFIG.moods[name].palette.length, name).toBeGreaterThanOrEqual(4)
  })
})

describe('CONFIG.audio', () => {
  // AGENTS.md: random mashing only sounds musical because every note is on
  // this scale. Changing it is a deliberate decision, not a tweak.
  it('stays on the major pentatonic scale', () => {
    expect(CONFIG.audio.scaleSemitones).toEqual([0, 2, 4, 7, 9])
  })
})
