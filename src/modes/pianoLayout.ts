import { CONFIG } from '../config'
import type { SmashEvent } from '../toys/types'

/**
 * Which piano key (0 = leftmost) a smash plays. Digits map 1..9, 0 onto the
 * keys in keyboard order; everything else uses its horizontal position, so a
 * letter plays the key under its spot on the keyboard and a tap plays the key
 * in its column. Always returns a valid index, however wild the input.
 */
export function keyIndex(
  e: Pick<SmashEvent, 'char' | 'isDigit' | 'x'>,
  width: number,
  keys: number = CONFIG.piano.keys,
): number {
  if (e.isDigit) return (Number(e.char) + keys - 1) % keys
  const i = Math.floor((e.x / width) * keys)
  return Number.isFinite(i) ? Math.min(Math.max(i, 0), keys - 1) : 0
}
