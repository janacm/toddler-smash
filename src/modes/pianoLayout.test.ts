import { describe, expect, it } from 'vitest'
import { keyIndex } from './pianoLayout'

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
