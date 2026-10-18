import { afterEach, describe, expect, it, vi } from 'vitest'
import { playToys } from './play'
import type { SmashEvent, Toy, ToyContext } from './types'

const event = (char = ''): SmashEvent => ({
  x: 0,
  y: 0,
  char,
  isLetter: /^[A-Z]$/.test(char),
  isDigit: false,
  index: 0,
  source: 'key',
})

/** Only `rng` is read by the router; `roll` is where in [0, total) it lands. */
const ctxRolling = (roll: (min: number, max: number) => number) =>
  ({ rng: { realInRange: vi.fn(roll) } }) as unknown as ToyContext

const toy = (name: string, extra: Partial<Toy> = {}): Toy => ({ name, play: vi.fn(), ...extra })

afterEach(() => vi.restoreAllMocks())

describe('playToys', () => {
  it('lets the first matching toy claim the event', () => {
    const letters = toy('letters', { match: (e) => e.isLetter })
    const also = toy('also', { match: (e) => e.isLetter })
    const random = toy('random', { weight: 5 })
    playToys(event('A'), ctxRolling(() => 0), [letters, also, random])
    expect(letters.play).toHaveBeenCalledOnce()
    expect(also.play).not.toHaveBeenCalled()
    expect(random.play).not.toHaveBeenCalled()
  })

  it('picks by weight when nothing claims the event', () => {
    const a = toy('a', { weight: 1 })
    const b = toy('b', { weight: 3 })
    playToys(event(), ctxRolling(() => 0.5), [a, b])
    playToys(event(), ctxRolling(() => 2), [a, b])
    expect(a.play).toHaveBeenCalledOnce()
    expect(b.play).toHaveBeenCalledOnce()
  })

  it('rolls over the total weight of the random rotation only', () => {
    const ctx = ctxRolling(() => 0)
    playToys(event(), ctx, [toy('m', { match: () => false, weight: 9 }), toy('a', { weight: 2 }), toy('b', { weight: 3 })])
    expect(ctx.rng.realInRange).toHaveBeenCalledWith(0, 5)
  })

  it('never picks a toy that has a match or no weight', () => {
    const matcher = toy('matcher', { match: () => false, weight: 10 })
    const unweighted = toy('unweighted')
    const zero = toy('zero', { weight: 0 })
    const only = toy('only', { weight: 1 })
    for (const roll of [0, 0.5, 1]) playToys(event(), ctxRolling(() => roll), [matcher, unweighted, zero, only])
    expect(only.play).toHaveBeenCalledTimes(3)
    expect(matcher.play).not.toHaveBeenCalled()
    expect(unweighted.play).not.toHaveBeenCalled()
    expect(zero.play).not.toHaveBeenCalled()
  })

  it('falls back to the last toy if the roll overshoots', () => {
    const a = toy('a', { weight: 1 })
    const b = toy('b', { weight: 1 })
    playToys(event(), ctxRolling(() => 99), [a, b])
    expect(b.play).toHaveBeenCalledOnce()
  })

  it('does nothing when no toy can play', () => {
    expect(() => playToys(event(), ctxRolling(() => 0), [])).not.toThrow()
    expect(() => playToys(event(), ctxRolling(() => 0), [toy('unweighted')])).not.toThrow()
  })

  it('swallows a toy that throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = toy('broken', {
      weight: 1,
      play: () => {
        throw new Error('boom')
      },
    })
    expect(() => playToys(event(), ctxRolling(() => 0), [broken])).not.toThrow()
    expect(warn).toHaveBeenCalledOnce()
  })
})
