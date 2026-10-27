import { describe, expect, it } from 'vitest'
import { getPuzzle, Progression, type GameId } from './model'

const games: readonly GameId[] = ['smash', 'piano', 'drawing']

function discover(progress: Progression, game: GameId): void {
  for (let i = 0; i < 3; i++) progress.follow(game, true)
}

function solve(progress: Progression, game: GameId): string[] {
  return getPuzzle(game, progress.state(game).solved).answer.map(value => progress.answer(game, value))
}

describe('authored puzzles', () => {
  it('has two distinct rounds per tier and progressively longer melodies and routes', () => {
    for (const game of games) {
      for (let tier = 0; tier < 3; tier++) {
        const first = getPuzzle(game, tier * 2)
        const second = getPuzzle(game, tier * 2 + 1)
        expect(first.kind).toBe(second.kind)
        expect(first.answer).not.toEqual(second.answer)
        for (const value of [...first.prompt, ...first.answer, ...second.prompt, ...second.answer]) {
          expect(first.choices).toContain(value)
        }
      }
    }
    expect([0, 2, 4].map(round => getPuzzle('piano', round).answer.length)).toEqual([2, 3, 4])
    expect([0, 2, 4].map(round => getPuzzle('drawing', round).answer.length)).toEqual([3, 4, 9])
    expect([0, 2, 4].map(round => getPuzzle('smash', round).kind)).toEqual(['match', 'pattern', 'memory'])
  })

  it('clamps rounds outside the range and uses whole round indexes', () => {
    expect(getPuzzle('smash', -1)).toEqual(getPuzzle('smash', 0))
    expect(getPuzzle('piano', 6)).toEqual(getPuzzle('piano', 5))
    expect(getPuzzle('piano', Infinity)).toEqual(getPuzzle('piano', 5))
    expect(getPuzzle('drawing', 2.9)).toEqual(getPuzzle('drawing', 2))
    expect(getPuzzle('drawing', NaN)).toEqual(getPuzzle('drawing', 0))
  })
})

describe('discovery and session state', () => {
  it('starts in free play and requires three consecutive firefly hits', () => {
    const progress = new Progression()
    expect(progress.state('smash')).toEqual({ discovered: false, entranceStep: 0, solved: 0, attempt: 0, view: 'free' })
    progress.enter('smash')
    expect(progress.state('smash').view).toBe('free')
    progress.follow('smash', true)
    progress.follow('smash', true)
    expect(progress.state('smash').discovered).toBe(false)
    progress.follow('smash', false)
    expect(progress.state('smash').entranceStep).toBe(0)
    discover(progress, 'smash')
    expect(progress.state('smash')).toMatchObject({ discovered: true, entranceStep: 3, view: 'puzzle' })
  })

  it('keeps each game and each session instance independent', () => {
    const progress = new Progression()
    discover(progress, 'piano')
    solve(progress, 'piano')
    expect(progress.state('smash')).toMatchObject({ discovered: false, solved: 0, view: 'free' })
    expect(progress.state('drawing')).toMatchObject({ discovered: false, solved: 0, view: 'free' })
    expect(new Progression().state('piano')).toMatchObject({ discovered: false, solved: 0, view: 'free' })
  })

  it('returns to free play immediately and reopens earned progress with one hit', () => {
    const progress = new Progression()
    discover(progress, 'piano')
    solve(progress, 'piano')
    progress.answer('piano', 1)
    progress.back('piano')
    expect(progress.state('piano')).toEqual({ discovered: true, entranceStep: 0, solved: 1, attempt: 0, view: 'free' })
    expect(progress.answer('piano', 2)).toBe('ignored')
    progress.follow('piano', false)
    expect(progress.state('piano').view).toBe('free')
    progress.follow('piano', true)
    expect(progress.state('piano')).toMatchObject({ solved: 1, attempt: 0, view: 'puzzle' })
  })

  it('clears an incomplete entrance on back and resets every game for a new player', () => {
    const progress = new Progression()
    progress.follow('smash', true)
    progress.back('smash')
    expect(progress.state('smash').entranceStep).toBe(0)
    for (const game of games) {
      discover(progress, game)
      solve(progress, game)
    }
    progress.reset()
    for (const game of games) expect(progress.state(game)).toEqual(new Progression().state(game))
  })
})

describe('puzzle answers', () => {
  it.each(games)('advances %s through all six authored rounds before unlocking the reward', game => {
    const progress = new Progression()
    discover(progress, game)
    for (let round = 0; round < 6; round++) {
      const length = getPuzzle(game, round).answer.length
      const results = solve(progress, game)
      expect(results).toEqual([...Array<string>(length - 1).fill('correct'), round === 5 ? 'unlock' : 'round'])
      expect(progress.state(game)).toMatchObject({ solved: round + 1, attempt: 0, view: round === 5 ? 'playground' : 'puzzle' })
    }
    expect(progress.answer(game, 0)).toBe('ignored')
    expect(progress.state(game).solved).toBe(6)
    progress.back(game)
    expect(progress.state(game).view).toBe('free')
    progress.follow(game, true)
    expect(progress.state(game).view).toBe('playground')
  })

  it('fully resets a wrong attempt, even when the wrong note is the beginning of the answer', () => {
    const progress = new Progression()
    discover(progress, 'piano')
    expect(progress.answer('piano', 0)).toBe('correct')
    expect(progress.answer('piano', 0)).toBe('wrong')
    expect(progress.state('piano').attempt).toBe(0)
    expect(progress.answer('piano', 1)).toBe('wrong')
    expect(progress.state('piano').solved).toBe(0)
    expect(solve(progress, 'piano')).toEqual(['correct', 'round'])
    expect(progress.answer('piano', 99)).toBe('wrong')
    expect(progress.state('piano').solved).toBe(1)
  })

  it('lets replay clear an attempt without removing an earned round', () => {
    const progress = new Progression()
    discover(progress, 'piano')
    solve(progress, 'piano')
    expect(progress.answer('piano', 1)).toBe('correct')
    progress.resetAttempt('piano')
    expect(progress.state('piano')).toMatchObject({ solved: 1, attempt: 0, view: 'puzzle' })
    expect(progress.answer('piano', 2)).toBe('wrong')
  })

  it('ignores repeated current Drawing nodes but rejects skips and reverse travel', () => {
    const progress = new Progression()
    discover(progress, 'drawing')
    expect(progress.answer('drawing', 3)).toBe('correct')
    expect(progress.answer('drawing', 3)).toBe('ignored')
    expect(progress.answer('drawing', 5)).toBe('wrong')
    expect(progress.state('drawing').attempt).toBe(0)
    expect(progress.answer('drawing', 5)).toBe('wrong')
    expect(progress.answer('drawing', 4)).toBe('wrong')
    expect(solve(progress, 'drawing')).toEqual(['correct', 'correct', 'round'])
  })

  it('requires a closed Drawing route to return to its starting node', () => {
    const progress = new Progression()
    discover(progress, 'drawing')
    for (let round = 0; round < 4; round++) solve(progress, 'drawing')
    const route = getPuzzle('drawing', 4).answer
    for (const node of route.slice(0, -1)) progress.answer('drawing', node)
    expect(progress.state('drawing')).toMatchObject({ solved: 4, attempt: route.length - 1 })
    expect(progress.answer('drawing', route.at(-2)!)).toBe('ignored')
    expect(progress.answer('drawing', route[0])).toBe('round')
    expect(progress.state('drawing').solved).toBe(5)
  })

  it('does not accumulate unrelated keyboard mashing into a melody', () => {
    const progress = new Progression()
    discover(progress, 'piano')
    // Each valid prefix is broken by unrelated presses; matching suffixes are discarded.
    const mash = [0, 0, 1, 2, 2, 0, 2, 1, 99, 0, -1, 1, NaN]
    for (let batch = 0; batch < 100; batch++) {
      for (const key of mash) progress.answer('piano', key)
    }
    expect(progress.state('piano')).toMatchObject({ solved: 0, attempt: 0, view: 'puzzle' })
  })

  it('does not accumulate interleaved multi-touch nodes into a Drawing route', () => {
    const progress = new Progression()
    discover(progress, 'drawing')
    const fingers = [3, 8, 4, 0, 5, 8]
    for (let batch = 0; batch < 100; batch++) {
      for (const node of fingers) progress.answer('drawing', node)
    }
    expect(progress.state('drawing')).toMatchObject({ solved: 0, attempt: 0, view: 'puzzle' })
  })
})
