import type { SmashEvent, Toy, ToyContext } from './types'

/**
 * Route one smash to whichever of `toys` should handle it. Each sub-game in
 * `src/modes/` passes its own list; the Smash game uses `TOYS`.
 *
 * Never throws. A toy that fails is skipped and the game keeps running — a
 * crash-free experience matters more here than any individual effect, because
 * the person holding the keyboard cannot read an error message.
 */
export function playToys(e: SmashEvent, ctx: ToyContext, toys: Toy[]): void {
  const claimed = toys.find((t) => t.match?.(e))
  const toy = claimed ?? pickWeighted(toys, ctx)
  if (!toy) return

  try {
    toy.play(e, ctx)
  } catch (err) {
    console.warn(`toy "${toy.name}" failed, ignoring:`, err)
  }
}

function pickWeighted(toys: Toy[], ctx: ToyContext): Toy | undefined {
  const pool = toys.filter((t) => !t.match && (t.weight ?? 0) > 0)
  if (pool.length === 0) return undefined

  const total = pool.reduce((sum, t) => sum + (t.weight ?? 1), 0)
  let roll = ctx.rng.realInRange(0, total)
  for (const toy of pool) {
    roll -= toy.weight ?? 1
    if (roll <= 0) return toy
  }
  return pool[pool.length - 1]
}
