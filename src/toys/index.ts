import { letterPop } from './letterPop'
import { shapeBurst } from './shapeBurst'
import { ripple } from './ripple'
import { critter } from './critter'
import { animalKeys, dinosaur, shark } from './animals'
import { trajectory } from './trajectory'
import { rotation } from './rotation'
import { connection } from './connection'
import { playToys } from './play'
import type { SmashEvent, Toy, ToyContext } from './types'

export type { SmashEvent, Toy, ToyContext } from './types'

/**
 * The registry. Add a new toy here and it is live — nothing else to wire.
 *
 * Order matters only for `match`: the first toy that claims an event wins.
 * Everything else is picked by `weight`.
 */
export const TOYS: Toy[] = [
  animalKeys,
  letterPop,
  shapeBurst,
  ripple,
  critter,
  dinosaur,
  shark,
  trajectory,
  rotation,
  connection,
]

/** Route one smash to a toy; never throws. See `playToys` in `play.ts`. */
export function playSmash(e: SmashEvent, ctx: ToyContext, toys: Toy[] = TOYS): void {
  playToys(e, ctx, toys)
}
