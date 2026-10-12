import { TOYS } from '../toys'
import type { Mode } from './types'

/** The original game: every press is a random toy from the registry. */
export const smash: Mode = {
  name: 'smash',
  label: 'Smash',
  icon: 'star',
  toys: TOYS,
}
