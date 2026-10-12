import { smash } from './smash'
import { piano } from './piano'
import type { Mode } from './types'

export type { Mode } from './types'

/**
 * The sub-game registry. Order is the grown-up panel's number keys (1, 2, ...)
 * and the order of the child's corner buttons.
 */
export const MODES: Mode[] = [smash, piano]

export function findMode(name: string): Mode {
  return MODES.find((m) => m.name === name) ?? MODES[0]
}
