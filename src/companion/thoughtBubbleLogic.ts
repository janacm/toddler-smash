import type { ShapeKey } from '../textures'
import type { AnimalFaceKind } from '../modes/pianoChoralLogic'

export type ThoughtTarget =
  | { kind: 'shape'; shape: ShapeKey; colorIndex?: number }
  | { kind: 'color'; colorIndex: number }
  | { kind: 'animal'; animal: 'dinosaur' | 'shark' | AnimalFaceKind }
  | { kind: 'note'; noteIndex: number; colorIndex: number }

export interface ThoughtMatchEvent {
  shape?: ShapeKey | string
  colorIndex?: number
  animal?: 'dinosaur' | 'shark' | AnimalFaceKind | string
  noteIndex?: number
  char?: string
}

export const SHAPES_LIST: readonly ShapeKey[] = ['star', 'heart', 'circle', 'triangle', 'square', 'ring'] as const
export const SMASH_ANIMALS: readonly ('dinosaur' | 'shark')[] = ['dinosaur', 'shark'] as const
export const PIANO_ANIMAL_TARGETS: readonly AnimalFaceKind[] = ['frog', 'kitten', 'bird', 'puppy'] as const

/** Checks equality between two thought targets to avoid immediate repeats. */
export function sameThought(a: ThoughtTarget | null, b: ThoughtTarget | null): boolean {
  if (!a || !b) return a === b
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'color':
      return b.kind === 'color' && a.colorIndex === b.colorIndex
    case 'shape':
      return b.kind === 'shape' && a.shape === b.shape && a.colorIndex === b.colorIndex
    case 'animal':
      return b.kind === 'animal' && a.animal === b.animal
    case 'note':
      return b.kind === 'note' && a.noteIndex === b.noteIndex
  }
}

/** Pure matcher: checks if the player's action matches the current thought target. */
export function checkThoughtMatch(target: ThoughtTarget, action: ThoughtMatchEvent): boolean {
  switch (target.kind) {
    case 'color':
      return action.colorIndex !== undefined && action.colorIndex === target.colorIndex
    case 'shape':
      if (action.shape !== target.shape) return false
      if (target.colorIndex !== undefined) {
        return action.colorIndex === target.colorIndex
      }
      return true
    case 'animal':
      if (action.animal === target.animal) return true
      if (target.animal === 'dinosaur') {
        if (action.char?.toUpperCase() === 'D') return true
        if (typeof action.shape === 'string' && action.shape.includes('dinosaur')) return true
      }
      if (target.animal === 'shark') {
        if (action.char?.toUpperCase() === 'S') return true
        if (typeof action.shape === 'string' && action.shape.includes('shark')) return true
      }
      return false
    case 'note':
      return action.noteIndex !== undefined && action.noteIndex === target.noteIndex
  }
}

/**
 * Picks a new thought target tailored strictly to what the active game mode can produce:
 * - Smash: shape or animal ('dinosaur' | 'shark')
 * - Piano: note or animal ('frog' | 'kitten' | 'bird' | 'puppy')
 * - Drawing: colour only
 */
export function pickNextThoughtTarget(
  prevTarget: ThoughtTarget | null,
  game: 'smash' | 'piano' | 'drawing',
  paletteLength: number,
  rng: () => number,
): ThoughtTarget {
  const safePaletteLen = Math.max(1, paletteLength)

  let candidate: ThoughtTarget = { kind: 'shape', shape: 'star' }
  for (let attempt = 0; attempt < 12; attempt++) {
    const roll = rng()
    if (game === 'piano') {
      if (roll < 0.5) {
        const noteIndex = Math.floor(rng() * 5) // Root pentatonic octave (5 notes)
        candidate = { kind: 'note', noteIndex, colorIndex: noteIndex % safePaletteLen }
      } else {
        const index = Math.floor(rng() * PIANO_ANIMAL_TARGETS.length)
        candidate = { kind: 'animal', animal: PIANO_ANIMAL_TARGETS[index] }
      }
    } else if (game === 'drawing') {
      candidate = { kind: 'color', colorIndex: Math.floor(rng() * safePaletteLen) }
    } else {
      // Smash mode: shape or animal
      if (roll < 0.6) {
        const shapeIdx = Math.floor(rng() * SHAPES_LIST.length)
        candidate = { kind: 'shape', shape: SHAPES_LIST[shapeIdx] }
      } else {
        const animalIdx = Math.floor(rng() * SMASH_ANIMALS.length)
        candidate = { kind: 'animal', animal: SMASH_ANIMALS[animalIdx] }
      }
    }

    if (!sameThought(candidate, prevTarget)) {
      return candidate
    }
  }

  return candidate
}
