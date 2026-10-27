/** Session-only discoveries. This module deliberately has no browser dependencies. */
export type GameId = 'smash' | 'piano' | 'drawing'

export interface Progress {
  discovered: boolean
  entranceStep: number
  solved: number
  attempt: number
  view: 'free' | 'puzzle' | 'playground'
}

export interface Puzzle {
  kind: 'match' | 'pattern' | 'memory' | 'melody' | 'path'
  prompt: readonly number[]
  answer: readonly number[]
  choices: readonly number[]
}

export type AnswerResult = 'ignored' | 'wrong' | 'correct' | 'round' | 'unlock'

const shapes = [0, 1, 2] as const
const nodes = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const

const PUZZLES: Record<GameId, readonly Puzzle[]> = {
  smash: [
    { kind: 'match', prompt: [0], answer: [0], choices: shapes },
    { kind: 'match', prompt: [1], answer: [1], choices: shapes },
    { kind: 'pattern', prompt: [0, 1, 0, 1], answer: [0, 1], choices: shapes },
    { kind: 'pattern', prompt: [2, 0, 2, 0], answer: [2, 0], choices: shapes },
    { kind: 'memory', prompt: [0, 2, 1], answer: [0, 2, 1], choices: shapes },
    { kind: 'memory', prompt: [2, 1, 0], answer: [2, 1, 0], choices: shapes },
  ],
  piano: [
    { kind: 'melody', prompt: [0, 1], answer: [0, 1], choices: shapes },
    { kind: 'melody', prompt: [1, 2], answer: [1, 2], choices: shapes },
    { kind: 'melody', prompt: [0, 2, 1], answer: [0, 2, 1], choices: shapes },
    { kind: 'melody', prompt: [2, 0, 1], answer: [2, 0, 1], choices: shapes },
    { kind: 'melody', prompt: [0, 1, 2, 1], answer: [0, 1, 2, 1], choices: shapes },
    { kind: 'melody', prompt: [2, 1, 0, 1], answer: [2, 1, 0, 1], choices: shapes },
  ],
  drawing: [
    { kind: 'path', prompt: [3, 4, 5], answer: [3, 4, 5], choices: nodes },
    { kind: 'path', prompt: [1, 4, 7], answer: [1, 4, 7], choices: nodes },
    { kind: 'path', prompt: [0, 1, 2, 5], answer: [0, 1, 2, 5], choices: nodes },
    { kind: 'path', prompt: [6, 3, 4, 5], answer: [6, 3, 4, 5], choices: nodes },
    { kind: 'path', prompt: [0, 1, 2, 5, 8, 7, 6, 3, 0], answer: [0, 1, 2, 5, 8, 7, 6, 3, 0], choices: nodes },
    { kind: 'path', prompt: [2, 1, 0, 3, 6, 7, 8, 5, 2], answer: [2, 1, 0, 3, 6, 7, 8, 5, 2], choices: nodes },
  ],
}

/** Completed games retain their last puzzle for presentation; they cannot solve it again. */
export function getPuzzle(game: GameId, solved: number): Puzzle {
  const index = Math.min(5, Math.max(0, Math.trunc(solved) || 0))
  return PUZZLES[game][index]
}

function freshProgress(): Progress {
  return { discovered: false, entranceStep: 0, solved: 0, attempt: 0, view: 'free' }
}

export class Progression {
  private games: Record<GameId, Progress> = {
    smash: freshProgress(), piano: freshProgress(), drawing: freshProgress(),
  }

  state(game: GameId): Readonly<Progress> {
    return this.games[game]
  }

  follow(game: GameId, hit: boolean): void {
    const state = this.games[game]
    if (!hit) {
      state.entranceStep = 0
      return
    }
    if (state.discovered) {
      this.enter(game)
      return
    }
    state.entranceStep += 1
    if (state.entranceStep === 3) {
      state.discovered = true
      this.enter(game)
    }
  }

  enter(game: GameId): void {
    const state = this.games[game]
    if (state.discovered) state.view = state.solved === 6 ? 'playground' : 'puzzle'
  }

  back(game: GameId): void {
    const state = this.games[game]
    state.view = 'free'
    state.entranceStep = 0
    state.attempt = 0
  }

  resetAttempt(game: GameId): void {
    this.games[game].attempt = 0
  }

  answer(game: GameId, value: number): AnswerResult {
    const state = this.games[game]
    if (state.view !== 'puzzle') return 'ignored'
    const puzzle = getPuzzle(game, state.solved)
    // A moving finger reports the same waypoint repeatedly while it stays over it.
    if (puzzle.kind === 'path' && state.attempt > 0 && value === puzzle.answer[state.attempt - 1]) {
      return 'ignored'
    }
    if (value !== puzzle.answer[state.attempt]) {
      // Do not keep a matching suffix: unrelated mashing must not build an answer.
      state.attempt = 0
      return 'wrong'
    }
    state.attempt += 1
    if (state.attempt < puzzle.answer.length) return 'correct'
    state.attempt = 0
    state.solved += 1
    if (state.solved === 6) {
      state.view = 'playground'
      return 'unlock'
    }
    return 'round'
  }

  reset(): void {
    this.games = { smash: freshProgress(), piano: freshProgress(), drawing: freshProgress() }
  }
}
