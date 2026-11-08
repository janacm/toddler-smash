import { describe, expect, it } from 'vitest'
import {
  ChoralPhraseDetector,
  PIANO_ANIMALS,
  calculatePentatonicHarmony,
  getAnimalForPianoKey,
} from './pianoChoralLogic'

describe('getAnimalForPianoKey', () => {
  it('maps sequential keys 0..3 to frog, kitten, bird, puppy', () => {
    expect(getAnimalForPianoKey(0)).toBe('frog')
    expect(getAnimalForPianoKey(1)).toBe('kitten')
    expect(getAnimalForPianoKey(2)).toBe('bird')
    expect(getAnimalForPianoKey(3)).toBe('puppy')
  })

  it('wraps cyclically for higher keys', () => {
    expect(getAnimalForPianoKey(4)).toBe('frog')
    expect(getAnimalForPianoKey(5)).toBe('kitten')
    expect(getAnimalForPianoKey(6)).toBe('bird')
    expect(getAnimalForPianoKey(7)).toBe('puppy')
    expect(getAnimalForPianoKey(8)).toBe('frog')
    expect(getAnimalForPianoKey(9)).toBe('kitten')
  })

  it('handles negative key indices safely', () => {
    expect(getAnimalForPianoKey(-1)).toBe('puppy')
    expect(getAnimalForPianoKey(-4)).toBe('frog')
  })

  it('defines 4 unique animals in canonical order', () => {
    expect(PIANO_ANIMALS).toEqual(['frog', 'kitten', 'bird', 'puppy'])
  })
})

describe('calculatePentatonicHarmony', () => {
  it('adds +2 scale degrees by default', () => {
    expect(calculatePentatonicHarmony(0)).toBe(2)
    expect(calculatePentatonicHarmony(1)).toBe(3)
    expect(calculatePentatonicHarmony(4)).toBe(6)
  })

  it('allows custom intervals', () => {
    expect(calculatePentatonicHarmony(2, 4)).toBe(6)
  })
})

describe('ChoralPhraseDetector', () => {
  it('detects a 3-note phrase within maxGapMs and computes harmony and animal faces', () => {
    const detector = new ChoralPhraseDetector({ maxGapMs: 1200 })
    expect(detector.recordNote(0, 1000)).toBeNull()
    expect(detector.recordNote(2, 1400)).toBeNull()
    const phrase = detector.recordNote(4, 1800)
    expect(phrase).toEqual({
      notes: [0, 2, 4],
      harmonies: [2, 4, 6],
      animals: ['frog', 'bird', 'frog'],
    })
  })

  it('ignores echo notes', () => {
    const detector = new ChoralPhraseDetector({ maxGapMs: 1200 })
    expect(detector.recordNote(0, 1000, true)).toBeNull()
    expect(detector.recordNote(1, 1100, false)).toBeNull()
    expect(detector.recordNote(2, 1200, true)).toBeNull()
    expect(detector.recordNote(3, 1300, false)).toBeNull()
    expect(detector.recordNote(4, 1400, false)).toEqual({
      notes: [1, 3, 4],
      harmonies: [3, 5, 6],
      animals: ['kitten', 'puppy', 'frog'],
    })
  })

  it('resets buffer when gap exceeds maxGapMs', () => {
    const detector = new ChoralPhraseDetector({ maxGapMs: 1000 })
    expect(detector.recordNote(0, 1000)).toBeNull()
    expect(detector.recordNote(1, 1500)).toBeNull()
    // Gap of 1100ms > 1000ms resets buffer, so note 2 starts a new phrase
    expect(detector.recordNote(2, 2600)).toBeNull()
    expect(detector.recordNote(3, 3000)).toBeNull()
    expect(detector.recordNote(4, 3400)).toEqual({
      notes: [2, 3, 4],
      harmonies: [4, 5, 6],
      animals: ['bird', 'puppy', 'frog'],
    })
  })

  it('clears state on reset()', () => {
    const detector = new ChoralPhraseDetector({ maxGapMs: 1200 })
    detector.recordNote(0, 1000)
    detector.recordNote(1, 1200)
    detector.reset()
    expect(detector.recordNote(2, 1400)).toBeNull()
  })

  it('uses default options when none are passed', () => {
    const detector = new ChoralPhraseDetector()
    expect(detector.recordNote(0, 100)).toBeNull()
    expect(detector.recordNote(1, 200)).toBeNull()
    expect(detector.recordNote(2, 300)).not.toBeNull()
  })

  it('respects custom harmonyInterval setting', () => {
    const detector = new ChoralPhraseDetector({ maxGapMs: 1200, harmonyInterval: 3 })
    detector.recordNote(0, 100)
    detector.recordNote(2, 200)
    const phrase = detector.recordNote(4, 300)
    expect(phrase?.harmonies).toEqual([3, 5, 7])
  })
})
