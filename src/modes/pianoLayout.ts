import { CONFIG } from '../config'
import type { SmashEvent } from '../toys/types'

/**
 * How many keys fit across `width` at no less than `minKeyPx` each: all ten
 * on a laptop or tablet, five to nine on a phone.
 */
export function pianoKeyCount(width: number, piano: typeof CONFIG.piano = CONFIG.piano): number {
  // n keys need n * minKeyPx + (n - 1) * gapPx; the piano spans 92% of width.
  const fit = Math.floor((width * 0.92 + piano.gapPx) / (piano.minKeyPx + piano.gapPx))
  return Math.min(piano.keys, Math.max(piano.minKeys, Number.isFinite(fit) ? fit : piano.keys))
}

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
