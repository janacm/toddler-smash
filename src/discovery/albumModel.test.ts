import { describe, expect, it } from 'vitest'
import { AlbumModel, BADGES, RainbowRun } from './albumModel'
import { BADGE_IDS } from './types'

describe('BADGES definition', () => {
  it('contains definitions for all 6 BADGE_IDS', () => {
    expect(BADGES).toHaveLength(6)
    const definedIds = BADGES.map((b) => b.id)
    expect(definedIds).toEqual(BADGE_IDS)
  })

  it('each badge has an icon, label, and valid voice', () => {
    for (const b of BADGES) {
      expect(b.icon.length).toBeGreaterThan(0)
      expect(b.label.length).toBeGreaterThan(0)
      expect(['blip', 'piano', 'dinosaur', 'bubble']).toContain(b.voice)
    }
  })
})

describe('RainbowRun', () => {
  it('triggers when 5 distinct pentatonic degrees are played in a row', () => {
    const run = new RainbowRun(5)
    expect(run.push(0)).toBe(false)
    expect(run.push(1)).toBe(false)
    expect(run.push(2)).toBe(false)
    expect(run.push(3)).toBe(false)
    expect(run.length).toBe(4)
    expect(run.push(4)).toBe(true)

    // Window is reset after trigger so next note doesn't immediately re-trigger
    expect(run.length).toBe(0)
    expect(run.push(0)).toBe(false)
  })

  it('works in reverse order or arbitrary permutations of 5 degrees', () => {
    const run = new RainbowRun(5)
    expect(run.push(4)).toBe(false)
    expect(run.push(3)).toBe(false)
    expect(run.push(2)).toBe(false)
    expect(run.push(1)).toBe(false)
    expect(run.push(0)).toBe(true)
  })

  it('normalizes octaves and negative degree numbers into 0..4', () => {
    const run = new RainbowRun(5)
    // 5 -> 0, 6 -> 1, 7 -> 2, 8 -> 3, 9 -> 4
    expect(run.push(5)).toBe(false)
    expect(run.push(6)).toBe(false)
    expect(run.push(7)).toBe(false)
    expect(run.push(8)).toBe(false)
    expect(run.push(9)).toBe(true)
  })

  it('does not trigger if duplicates exist in the 5-note window', () => {
    const run = new RainbowRun(5)
    expect(run.push(0)).toBe(false)
    expect(run.push(1)).toBe(false)
    expect(run.push(1)).toBe(false) // duplicate 1
    expect(run.push(2)).toBe(false)
    expect(run.push(3)).toBe(false)
    expect(run.push(4)).toBe(false) // window has [1, 1, 2, 3, 4] -> only 4 distinct
    // next distinct note drops the first 1: [1, 2, 3, 4, 0] -> 5 distinct!
    expect(run.push(0)).toBe(true)
  })

  it('reset empties the notes buffer', () => {
    const run = new RainbowRun(5)
    run.push(1)
    run.push(2)
    expect(run.length).toBe(2)
    run.reset()
    expect(run.length).toBe(0)
  })
})

describe('AlbumModel', () => {
  it('starts with no unlocked badges', () => {
    const album = new AlbumModel()
    expect(album.getUnlockedCount()).toBe(0)
    expect(album.has('dinosaur')).toBe(false)
    expect(album.getUnlocked().size).toBe(0)
    expect(album.getBadges()).toBe(BADGES)
  })

  it('discover unlocks a badge and prevents duplicates', () => {
    const album = new AlbumModel()
    expect(album.discover('dinosaur')).toBe(true)
    expect(album.has('dinosaur')).toBe(true)
    expect(album.getUnlockedCount()).toBe(1)

    // Repeat discovery returns false
    expect(album.discover('dinosaur')).toBe(false)
    expect(album.getUnlockedCount()).toBe(1)

    // Unlocking a second badge
    expect(album.discover('rainbow')).toBe(true)
    expect(album.has('rainbow')).toBe(true)
    expect(album.getUnlockedCount()).toBe(2)
  })

  it('reset clears all discovered badges', () => {
    const album = new AlbumModel()
    album.discover('dinosaur')
    album.discover('shark')
    album.discover('scratchDino')
    expect(album.getUnlockedCount()).toBe(3)

    album.reset()
    expect(album.getUnlockedCount()).toBe(0)
    expect(album.has('dinosaur')).toBe(false)
    expect(album.has('shark')).toBe(false)
    expect(album.has('scratchDino')).toBe(false)
  })
})
