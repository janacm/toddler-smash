import { describe, expect, it } from 'vitest'
import {
  checkThoughtMatch,
  pickNextThoughtTarget,
  sameThought,
  type ThoughtTarget,
} from './thoughtBubbleLogic'

describe('sameThought', () => {
  it('handles null comparisons', () => {
    expect(sameThought(null, null)).toBe(true)
    expect(sameThought(null, { kind: 'color', colorIndex: 0 })).toBe(false)
    expect(sameThought({ kind: 'color', colorIndex: 0 }, null)).toBe(false)
  })

  it('checks different kinds', () => {
    expect(
      sameThought({ kind: 'color', colorIndex: 1 }, { kind: 'note', noteIndex: 1, colorIndex: 1 }),
    ).toBe(false)
  })

  it('compares color thoughts', () => {
    expect(sameThought({ kind: 'color', colorIndex: 2 }, { kind: 'color', colorIndex: 2 })).toBe(true)
    expect(sameThought({ kind: 'color', colorIndex: 2 }, { kind: 'color', colorIndex: 3 })).toBe(false)
  })

  it('compares shape thoughts with and without colorIndex', () => {
    expect(sameThought({ kind: 'shape', shape: 'star' }, { kind: 'shape', shape: 'star' })).toBe(true)
    expect(sameThought({ kind: 'shape', shape: 'star' }, { kind: 'shape', shape: 'heart' })).toBe(false)
    expect(
      sameThought(
        { kind: 'shape', shape: 'star', colorIndex: 1 },
        { kind: 'shape', shape: 'star', colorIndex: 1 },
      ),
    ).toBe(true)
    expect(
      sameThought(
        { kind: 'shape', shape: 'star', colorIndex: 1 },
        { kind: 'shape', shape: 'star', colorIndex: 2 },
      ),
    ).toBe(false)
    expect(
      sameThought(
        { kind: 'shape', shape: 'star', colorIndex: 1 },
        { kind: 'shape', shape: 'star' },
      ),
    ).toBe(false)
  })

  it('compares animal thoughts', () => {
    expect(sameThought({ kind: 'animal', animal: 'dinosaur' }, { kind: 'animal', animal: 'dinosaur' })).toBe(true)
    expect(sameThought({ kind: 'animal', animal: 'dinosaur' }, { kind: 'animal', animal: 'shark' })).toBe(false)
    expect(sameThought({ kind: 'animal', animal: 'frog' }, { kind: 'animal', animal: 'kitten' })).toBe(false)
  })

  it('compares note thoughts', () => {
    expect(
      sameThought(
        { kind: 'note', noteIndex: 2, colorIndex: 2 },
        { kind: 'note', noteIndex: 2, colorIndex: 0 },
      ),
    ).toBe(true)
    expect(
      sameThought(
        { kind: 'note', noteIndex: 2, colorIndex: 2 },
        { kind: 'note', noteIndex: 3, colorIndex: 2 },
      ),
    ).toBe(false)
  })
})

describe('checkThoughtMatch', () => {
  it('matches color targets strictly by colorIndex', () => {
    const target: ThoughtTarget = { kind: 'color', colorIndex: 3 }
    expect(checkThoughtMatch(target, { colorIndex: 3 })).toBe(true)
    expect(checkThoughtMatch(target, { colorIndex: 4 })).toBe(false)
    expect(checkThoughtMatch(target, {})).toBe(false)
  })

  it('matches shape targets with or without color constraint', () => {
    const shapeOnly: ThoughtTarget = { kind: 'shape', shape: 'star' }
    expect(checkThoughtMatch(shapeOnly, { shape: 'star' })).toBe(true)
    expect(checkThoughtMatch(shapeOnly, { shape: 'star', colorIndex: 2 })).toBe(true)
    expect(checkThoughtMatch(shapeOnly, { shape: 'heart' })).toBe(false)

    const shapeAndColor: ThoughtTarget = { kind: 'shape', shape: 'star', colorIndex: 2 }
    expect(checkThoughtMatch(shapeAndColor, { shape: 'star', colorIndex: 2 })).toBe(true)
    expect(checkThoughtMatch(shapeAndColor, { shape: 'star', colorIndex: 1 })).toBe(false)
    expect(checkThoughtMatch(shapeAndColor, { shape: 'star' })).toBe(false)
  })

  it('matches animal targets including dinosaur and shark shortcuts/textures', () => {
    const dino: ThoughtTarget = { kind: 'animal', animal: 'dinosaur' }
    expect(checkThoughtMatch(dino, { animal: 'dinosaur' })).toBe(true)
    expect(checkThoughtMatch(dino, { char: 'D' })).toBe(true)
    expect(checkThoughtMatch(dino, { char: 'd' })).toBe(true)
    expect(checkThoughtMatch(dino, { shape: 'dinosaur-roar-night' })).toBe(true)
    expect(checkThoughtMatch(dino, { char: 'S' })).toBe(false)
    expect(checkThoughtMatch(dino, { shape: 'star' })).toBe(false)

    const shark: ThoughtTarget = { kind: 'animal', animal: 'shark' }
    expect(checkThoughtMatch(shark, { animal: 'shark' })).toBe(true)
    expect(checkThoughtMatch(shark, { char: 'S' })).toBe(true)
    expect(checkThoughtMatch(shark, { char: 's' })).toBe(true)
    expect(checkThoughtMatch(shark, { shape: 'shark-grin' })).toBe(true)
    expect(checkThoughtMatch(shark, { char: 'D' })).toBe(false)

    const frog: ThoughtTarget = { kind: 'animal', animal: 'frog' }
    expect(checkThoughtMatch(frog, { animal: 'frog' })).toBe(true)
    expect(checkThoughtMatch(frog, { animal: 'puppy' })).toBe(false)
    expect(checkThoughtMatch(frog, { char: 'D' })).toBe(false)
  })

  it('matches note targets by noteIndex', () => {
    const note: ThoughtTarget = { kind: 'note', noteIndex: 2, colorIndex: 2 }
    expect(checkThoughtMatch(note, { noteIndex: 2 })).toBe(true)
    expect(checkThoughtMatch(note, { noteIndex: 3 })).toBe(false)
    expect(checkThoughtMatch(note, {})).toBe(false)
  })
})

describe('pickNextThoughtTarget', () => {
  it('generates shape or animal for smash mode', () => {
    const rng = () => 0.2 // roll < 0.6 -> shape
    const target = pickNextThoughtTarget(null, 'smash', 8, rng)
    expect(target.kind).toBe('shape')

    const rngAnimal = () => 0.8 // roll >= 0.6 -> animal
    const targetAnimal = pickNextThoughtTarget(null, 'smash', 8, rngAnimal)
    expect(targetAnimal.kind).toBe('animal')
    expect(['dinosaur', 'shark']).toContain((targetAnimal as { animal: string }).animal)
  })

  it('generates note or animal for piano mode', () => {
    const rngNote = () => 0.2 // roll < 0.5 -> note
    const targetNote = pickNextThoughtTarget(null, 'piano', 8, rngNote)
    expect(targetNote.kind).toBe('note')

    const rngAnimal = () => 0.7 // roll >= 0.5 -> animal
    const targetAnimal = pickNextThoughtTarget(null, 'piano', 8, rngAnimal)
    expect(targetAnimal.kind).toBe('animal')
    expect(['frog', 'kitten', 'bird', 'puppy']).toContain((targetAnimal as { animal: string }).animal)
  })

  it('generates colour only for drawing mode', () => {
    let call = 0
    const values = [0.1, 0.4, 0.7]
    const rng = () => values[call++ % values.length]
    const target = pickNextThoughtTarget(null, 'drawing', 8, rng)
    expect(target.kind).toBe('color')
    expect((target as { colorIndex: number }).colorIndex).toBeGreaterThanOrEqual(0)
    expect((target as { colorIndex: number }).colorIndex).toBeLessThan(8)
  })

  it('avoids consecutive identical targets', () => {
    let call = 0
    // First candidate matches prev, second candidate differs
    const values = [0.1, 0.0, 0.1, 0.5]
    const rng = () => values[call++ % values.length]

    const prev: ThoughtTarget = { kind: 'color', colorIndex: 0 }
    const next = pickNextThoughtTarget(prev, 'drawing', 8, rng)
    expect(next).not.toEqual(prev)
  })

  it('falls back to candidate if all attempts collide with prevTarget', () => {
    const rng = () => 0 // Always returns colorIndex 0
    const prev: ThoughtTarget = { kind: 'color', colorIndex: 0 }
    const next = pickNextThoughtTarget(prev, 'drawing', 1, rng)
    expect(next).toEqual({ kind: 'color', colorIndex: 0 })
  })
})
