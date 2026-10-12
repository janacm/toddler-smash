import { describe, expect, it } from 'vitest'
import { keyIndex, pianoKeyCount } from './pianoLayout'

describe('pianoKeyCount', () => {
  const piano = { keys: 10, minKeys: 5, minKeyPx: 60, gapPx: 10, heightFrac: 0.42 } as const

  it('fits all ten keys on a laptop or tablet', () => {
    expect(pianoKeyCount(1280, piano)).toBe(10)
    expect(pianoKeyCount(768, piano)).toBe(10)
  })

  it('uses fewer, finger-sized keys on a phone', () => {
    expect(pianoKeyCount(390, piano)).toBe(5)
    expect(pianoKeyCount(600, piano)).toBe(8)
  })

  it('never goes below the minimum, however narrow', () => {
    expect(pianoKeyCount(200, piano)).toBe(5)
    expect(pianoKeyCount(0, piano)).toBe(5)
  })

  it('keeps each key at least minKeyPx wide when it can', () => {
    for (const width of [480, 540, 600, 700]) {
      const n = pianoKeyCount(width, piano)
      const keyW = (width * 0.92 - piano.gapPx * (n - 1)) / n
      expect(keyW, `width ${width}`).toBeGreaterThanOrEqual(piano.minKeyPx)
    }
  })
})

const WIDTH = 1000
const digit = (char: string) => ({ char, isDigit: true, x: Math.random() * WIDTH })
const at = (x: number) => ({ char: '', isDigit: false, x })

describe('keyIndex', () => {
  it('maps the number row 1..9, 0 onto the keys left to right', () => {
    expect('1234567890'.split('').map((c) => keyIndex(digit(c), WIDTH, 10))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('ignores where a digit was positioned on screen', () => {
    expect(keyIndex({ char: '3', isDigit: true, x: WIDTH - 1 }, WIDTH, 10)).toBe(2)
  })

  it('maps other input to the key column under it', () => {
    expect(keyIndex(at(0), WIDTH, 10)).toBe(0)
    expect(keyIndex(at(99), WIDTH, 10)).toBe(0)
    expect(keyIndex(at(100), WIDTH, 10)).toBe(1)
    expect(keyIndex(at(550), WIDTH, 10)).toBe(5)
    expect(keyIndex(at(999), WIDTH, 10)).toBe(9)
  })

  it('clamps input outside the screen to the end keys', () => {
    expect(keyIndex(at(-50), WIDTH, 10)).toBe(0)
    expect(keyIndex(at(WIDTH), WIDTH, 10)).toBe(9)
    expect(keyIndex(at(WIDTH * 3), WIDTH, 10)).toBe(9)
  })

  it('returns a valid key even for a zero-width screen', () => {
    for (const x of [0, 10, -10, NaN]) {
      const i = keyIndex(at(x), 0, 10)
      expect(Number.isInteger(i) && i >= 0 && i < 10, `x=${x} gave ${i}`).toBe(true)
    }
  })

  it('wraps digits onto a smaller piano', () => {
    expect(keyIndex(digit('7'), WIDTH, 5)).toBe(1)
    expect(keyIndex(digit('0'), WIDTH, 5)).toBe(4)
  })
})
