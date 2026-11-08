import Phaser from 'phaser'
import type { SpritePool, TextPool } from '../pool'
import type { Synth } from '../audio'
import type { ComboHit } from '../combo'
import type { Mood } from '../config'

/**
 * One press, tap, or click. Everything the game reacts to arrives as one of
 * these, whatever the input device was.
 */
export interface SmashEvent {
  x: number
  y: number
  /** 'A'-'Z' or '0'-'9' when the press maps to a printable character, else ''. */
  char: string
  isLetter: boolean
  isDigit: boolean
  /** Monotonic counter across the whole session. Handy for cycling behaviour. */
  index: number
  source: 'key' | 'pointer'
  /** Which finger or mouse, for pointer events. Matches `StrokeEvent`. */
  pointerId?: number
}

/**
 * A finger or held mouse button moving, or lifting. Unlike smashes these are
 * not rate-limited, so a mode can draw a continuous line from them.
 */
export interface StrokeEvent {
  pointerId: number
  x: number
  y: number
  phase: 'move' | 'end'
}

/** Everything a toy is allowed to touch. */
export interface ToyContext {
  scene: Phaser.Scene
  pool: SpritePool
  text: TextPool
  synth: Synth
  rng: Phaser.Math.RandomDataGenerator
  width: number
  height: number
  /** A palette colour. Pass a seed to keep a burst visually coherent. */
  color(seed?: number): number
  /** Where this press sits in the current streak; drives pitch and juice. */
  combo: ComboHit
  /** The active mood, so toys can scale motion and decay (Bedtime is calmer). */
  mood: Mood
}

/**
 * A self-contained thing that can happen when the screen is smashed.
 *
 * ADDING A NEW TOY IS THE MAIN WAY TO EXTEND THIS GAME:
 *   1. Create `src/toys/myToy.ts` exporting a `Toy`.
 *   2. Add it to the array in `src/toys/index.ts`.
 * That is the entire contract. No scene edits, no wiring.
 */
export interface Toy {
  name: string
  /**
   * Return true to claim this event exclusively. Used by toys that should
   * always win for a given input (letters, for example). Omit for a toy that
   * is just part of the random rotation.
   */
  match?(e: SmashEvent): boolean
  /** Relative chance of being picked when no toy claimed the event. */
  weight?: number
  play(e: SmashEvent, ctx: ToyContext): void
}
