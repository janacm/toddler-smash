// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from './config'
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

describe('saved settings', () => {
  const fresh = async () => {
    vi.resetModules()
    return import('./settings')
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('come back after a reload', async () => {
    const first = await fresh()
    first.settings.mood = 'bedtime'
    first.settings.childCanSwitch = false
    first.saveSettings()

    const second = await fresh()
    expect(second.settings).toEqual({ mode: 'smash', mood: 'bedtime', childCanSwitch: false })
    expect(second.currentMood()).toEqual(CONFIG.moods.bedtime)
  })

  it('fall back to defaults when storage is unreadable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied')
      },
    })
    expect((await fresh()).settings).toEqual(DEFAULTS)
  })

  it('save quietly when storage is full', async () => {
    const { saveSettings } = await fresh()
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(() => saveSettings()).not.toThrow()
  })
})
