import { describe, expect, it } from 'vitest'
import { parseSettings } from './settings'

const DEFAULTS = { mode: 'smash', mood: 'daytime', childCanSwitch: true }

describe('parseSettings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(parseSettings(null)).toEqual(DEFAULTS)
  })

  it('reads back valid settings', () => {
    const saved = { mode: 'piano', mood: 'bedtime', childCanSwitch: false }
    expect(parseSettings(JSON.stringify(saved))).toEqual(saved)
  })

  it.each(['{', 'null', '42', '"bedtime"', '[]', ''])('survives junk: %j', (stored) => {
    expect(parseSettings(stored)).toEqual(DEFAULTS)
  })

  it('drops a mood that no longer exists but keeps the other fields', () => {
    const stored = JSON.stringify({ mode: 'piano', mood: 'disco', childCanSwitch: false })
    expect(parseSettings(stored)).toEqual({ mode: 'piano', mood: 'daytime', childCanSwitch: false })
  })

  it('does not treat inherited object keys as moods', () => {
    expect(parseSettings(JSON.stringify({ mood: 'toString' })).mood).toBe('daytime')
  })

  it('replaces fields of the wrong type', () => {
    const stored = JSON.stringify({ mode: 7, mood: ['bedtime'], childCanSwitch: 'yes' })
    expect(parseSettings(stored)).toEqual(DEFAULTS)
  })

  it('returns a fresh object each time', () => {
    const a = parseSettings(null)
    a.mood = 'bedtime'
    expect(parseSettings(null).mood).toBe('daytime')
  })
})
