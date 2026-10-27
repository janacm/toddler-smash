import type { StrokeEvent, Toy, ToyContext } from '../toys/types'

/**
 * A sub-game. The scene runs exactly one at a time. The grown-up panel picks
 * it with a number key, and the child can pick it with the round picture
 * buttons in the top-right corner.
 *
 * ADDING A SUB-GAME:
 *   1. Create `src/modes/myMode.ts` exporting a `Mode`.
 *   2. Add it to `MODES` in `src/modes/index.ts`.
 * No scene edits. Moods (daytime, bedtime) apply automatically.
 */
export interface Mode {
  /** Stable id, saved in settings. */
  name: string
  /** Shown in the grown-up panel. */
  label: string
  /** Texture drawn on the child's switch button (see `textures.ts`). */
  icon: string
  /** Every smash in this mode goes through these, exactly as in `toys/`. */
  toys: Toy[]
  /**
   * Build scenery that stays up for the life of the mode, like the piano's
   * keys, and return a cleanup that removes it. Called again after a resize
   * or a mood change. Scenery is created once per entry, so it may use
   * `scene.add` directly; per-smash visuals must still go through the pools.
   */
  enter?(ctx: ToyContext): () => void
  /**
   * Finger and mouse drags, for modes that draw. The press that starts a drag
   * still arrives as a smash first, but may have been rate-limited away, so a
   * move from an unknown `pointerId` should be treated as a new stroke.
   */
  stroke?(e: StrokeEvent, ctx: ToyContext): void
  /** Toggle an earned creative power without rebuilding or clearing scenery. */
  setPlayground?(active: boolean, ctx: ToyContext): void
  /** Paint one deliberate keyboard movement using the same brush as touch. */
  paintSegment?(from: { x: number; y: number }, to: { x: number; y: number }, ctx: ToyContext): void
  /** Demonstrate a piano note without treating it as player input or an echo. */
  replayNote?(index: number, ctx: ToyContext): void
}
