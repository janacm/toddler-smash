# Implementation Plan: Technique 4 (Harmonic Call-and-Response Sound Toys) & Technique 6 (Pictorial Thought-Bubble Requests)

## Executive Summary

This plan specifies the complete architecture and implementation details for **Technique 4 (Harmonic Call-and-Response Sound Toys)** and **Technique 6 (Pictorial Thought-Bubble Requests)** in `toddler-smash`.

The game targets 2-to-4-year-olds who cannot read, cannot follow verbal instructions, and will press every button or lean on the screen. Consequently, these features embody two foundational early-childhood design principles:
1. **Harmonic Call-and-Response Sound Toys**: Piano keys are stamped with friendly procedural animal faces (frog, kitten, bird, puppy). When a child plays a 3-note melodic phrase, the animals sing back the phrase in a sweet call-and-response choral echo, harmonized in consonant pentatonic intervals (+2 scale degrees). This introduces conversational musical dialogue without fear of failure.
2. **Pictorial Thought-Bubble Requests**: A charming procedural companion in the top-left corner displays a soft visual thought bubble with an iconic picture target (a color, shape, piano note, or animal face). Matching the request triggers a celebratory backflip, eats the icon, and drops a sparkling reward. Ignoring the request carries **zero penalty**—no timers, no buzzers, no error states, and the companion stays happy.
3. **Strict Zero-Failure Architecture & Pure Logic**: All phrase detection, harmony calculations, queue management, and thought-bubble matching are isolated into browser-independent TypeScript modules (`pianoChoralLogic.ts`, `choralEchoQueue.ts`, `thoughtBubbleLogic.ts`) covered by 100% Vitest unit tests meeting repository coverage gates (>=90% lines/statements, >=85% branches/functions).

---

## 1. Architectural Blueprint & Information Flow

```
                      User Input (Keyboard / Touch / Mouse)
                                       │
                                       ▼
                            PlayScene.handleSmash(e)
                                       │
                  ┌────────────────────┴────────────────────┐
                  │                                         │
                  ▼                                         ▼
         ThoughtCompanionController                   Mode.toys / Piano
   (src/companion/thoughtCompanion.ts)              (src/modes/piano.ts)
                  │                                         │
                  ├── matchThought(target, action)          ├── keyIndex(e) -> key
                  │   (src/companion/thoughtBubbleLogic.ts) │
                  │                                         ├── playKey(key) -> synth.play('piano')
                  ├── If MATCH:                             │
                  │     ├── Companion backflip animation    └── ChoralPhraseDetector.recordNote(key)
                  │     ├── Icon flies to mouth & eaten         (src/modes/pianoChoralLogic.ts)
                  │     ├── Pooled sparkling star burst                    │
                  │     ├── Ascending pentatonic chime                     ▼
                  │     └── New thought floats in             If 3-note phrase detected:
                  │                                                        │
                  └── If NO MATCH:                                         ▼
                        └── Stays happy, zero feedback          ChoralEchoQueue.schedulePhrase()
                                                                (src/modes/choralEchoQueue.ts)
                                                                           │
                                                                           ▼
                                                             Call-and-Response Echo (Delay 550ms):
                                                             ├── Note 0 + Harmony (Animal 0 sings & squashes)
                                                             ├── Note 1 + Harmony (Animal 1 sings & squashes)
                                                             └── Note 2 + Harmony (Animal 2 sings & squashes)
                                                                 (synth.play('choral'), pooled notes/sparkles)
```

---

## 2. Technique 4: Piano Animal Faces & Choral Echoes

### 2.1 The Concept & Experience
In `modes/piano.ts`, the rainbow piano keys span the bottom of the screen. Toddlers naturally experiment with sequences. When the child taps 3 keys within a natural cadence:
1. Each key features a friendly procedural animal face stamped near the upper center:
   - **Key 0, 4, 8**: Frog (big eyes, round head, blushing cheeks, wide happy smile)
   - **Key 1, 5, 9**: Kitten (triangular ears, cute whiskers, rosy nose)
   - **Key 2, 6**: Bird (crested head, round eye, friendly beak)
   - **Key 3, 7**: Puppy (floppy curved ears, button snout, playful grin)
2. As the child plays, the key dips by 12px, its animal face dips along with it, and normal piano audio rings out.
3. The pure `ChoralPhraseDetector` records the sequence. Upon playing 3 notes with no gap greater than `phraseMaxGapMs` (1200ms), a **choral call-and-response echo** is triggered.
4. After a respectful 550ms pause (allowing the child's last note to ring out), the piano choir sings the phrase back:
   - **Beat 1** ($t = 0$): Key $n_0$ dips, its animal squashes and opens its mouth in song (`-sing` texture), and WebAudio plays $n_0$ along with its pentatonic harmony $n_0 + 2$ using a warm singing `'choral'` timbre.
   - **Beat 2** ($t = 280\text{ms}$): Key $n_1$ dips, animal sings, plays $n_1$ and harmony $n_1 + 2$.
   - **Beat 3** ($t = 560\text{ms}$): Key $n_2$ dips, animal sings, plays $n_2$ and harmony $n_2 + 2$.
   - A flurry of pooled rainbow musical notes and sparkles float up gently.

### 2.2 Strict Musical Consonance (Pentatonic Harmony)
In `CONFIG.audio.scaleSemitones`: `[0, 2, 4, 7, 9]` (C, D, E, G, A).
Harmonizing by +2 scale degrees yields:
- Note 0 (C) + Note 2 (E) = Major 3rd (sweet, uplifting)
- Note 1 (D) + Note 3 (G) = Perfect 4th (joyful, open)
- Note 2 (E) + Note 4 (A) = Perfect 4th (gentle, resonant)
- Note 3 (G) + Note 5 (C') = Perfect 4th (bright, triumphant)
- Note 4 (A) + Note 6 (D') = Perfect 4th (melodic)

Every single harmony combination is mathematically guaranteed to be on the pentatonic scale. There is no possibility of dissonance.

### 2.3 Polyphony & Voice Safety
- Each choral step plays root + harmony (2 voices) at `gainScale = 0.45` (quiet, polite echo).
- WebAudio synth voice limit is `maxVoices = 8`. 2 voices leaves 6 voices free, so forearm mashing during an echo never clips.
- `ChoralEchoQueue` is capped: at most 1 active choral sequence at any instant.
- Any child input during the echo or mode/mood transition immediately calls `.cancel()`.

---

## 3. Technique 6: Pictorial Thought-Bubble Requests

### 3.1 The Concept & Experience
Preschoolers aged 2 to 4 struggle with abstract instructions, text, and negative feedback. Sago Mini's thought-bubble technique offers an opt-in invitation:
1. **The Companion**:
   - Situated in the top-left corner (`safeArea.left + 58, safeArea.top + 78`), an uncluttered screen quadrant that never overlaps the mode switcher (top-right), the `#edge-logo` (top-center), or piano keys (bottom).
   - A friendly procedural animal companion (e.g. dinosaur or critter) with an idle breathing animation (`scaleY: 1.05`, 1400ms duration, yoyo, repeat -1).
   - Tapping the companion directly triggers an amused wiggle/squash and a happy blip.
2. **The Soft Thought Bubble**:
   - Floats above the companion's head with 2 trailing dots and a soft cloud bubble (`thoughtBubble`).
   - Inside the bubble, a clear pictorial target is displayed:
     - **Smash Mode**: A glowing colored shape (e.g. golden star, purple heart, red circle) or animal stamp (dinosaur or shark).
     - **Piano Mode**: A colored piano note or animal key face (frog, kitten, bird, puppy).
     - **Drawing Mode**: A colored sticker shape or palette color.
3. **Non-Punitive Matching**:
   - **If the toddler ignores it**: The companion stays happy, breathing gently. No countdown, no timer, no negative sound, no sad face. After 25 seconds of non-matching, the bubble can gently pop into soft cloud puffs and a new thought floats in.
   - **If the toddler matches it**:
     - **Backflip**: The companion leaps up, flips 360°, and lands with an elastic squash (`scaleX: 1.25, scaleY: 0.8`).
     - **Eats the icon**: The target icon zooms towards the companion's mouth and scales to zero with a satisfying "pop/nom" sound.
     - **Sparkling reward**: 8 to 10 pooled stars and confetti dots burst outward with radial velocities and fade away (`ctx.pool.spawn('star', ...)`).
     - **Audio fanfare**: ctx.synth plays an ascending pentatonic chime (`chime()`).
     - A fresh thought bubble smoothly appears after a calm 1.5-second pause.
4. **Challenge Mode Deference**:
   - When a hidden challenge puzzle is entered (`progress.state.view === 'puzzle'`), the companion is hidden to maintain visual focus and eliminate cognitive clutter.

---

## 4. Pure Logic Module Specifications

### 4.1 `src/modes/pianoChoralLogic.ts`

Zero Phaser or browser dependencies. Completely testable with Vitest.

```ts
export type AnimalFaceKind = 'frog' | 'kitten' | 'bird' | 'puppy'

export const PIANO_ANIMALS: readonly AnimalFaceKind[] = ['frog', 'kitten', 'bird', 'puppy'] as const

/** Maps any piano key index (0..n) cyclically to one of the 4 animal faces. */
export function getAnimalForPianoKey(keyIndex: number): AnimalFaceKind {
  const n = PIANO_ANIMALS.length
  return PIANO_ANIMALS[((keyIndex % n) + n) % n]
}

/** Pentatonic harmony interval (+2 scale degrees = pentatonic third). */
export function calculatePentatonicHarmony(noteIndex: number, interval = 2): number {
  return noteIndex + interval
}

export interface ChoralPhrase {
  notes: [number, number, number]
  harmonies: [number, number, number]
  animals: [AnimalFaceKind, AnimalFaceKind, AnimalFaceKind]
}

export interface PhraseDetectorOptions {
  maxGapMs: number
  phraseLength?: number
}

/**
 * Detects 3-note melodic phrases within a sliding time window.
 * Ignores system echo notes. Resets on time-out or clear.
 */
export class ChoralPhraseDetector {
  private buffer: Array<{ note: number; time: number }> = []
  private readonly maxGapMs: number
  private readonly phraseLength: number

  constructor(options: PhraseDetectorOptions = { maxGapMs: 1200, phraseLength: 3 }) {
    this.maxGapMs = options.maxGapMs
    this.phraseLength = options.phraseLength ?? 3
  }

  recordNote(noteIndex: number, timeMs: number, isEcho = false): ChoralPhrase | null {
    if (isEcho) return null

    if (this.buffer.length > 0) {
      const lastTime = this.buffer[this.buffer.length - 1].time
      if (timeMs - lastTime > this.maxGapMs) {
        this.buffer = []
      }
    }

    this.buffer.push({ note: noteIndex, time: timeMs })

    if (this.buffer.length >= this.phraseLength) {
      const slice = this.buffer.slice(-this.phraseLength)
      const notes: [number, number, number] = [slice[0].note, slice[1].note, slice[2].note]
      const harmonies: [number, number, number] = [
        calculatePentatonicHarmony(notes[0]),
        calculatePentatonicHarmony(notes[1]),
        calculatePentatonicHarmony(notes[2]),
      ]
      const animals: [AnimalFaceKind, AnimalFaceKind, AnimalFaceKind] = [
        getAnimalForPianoKey(notes[0]),
        getAnimalForPianoKey(notes[1]),
        getAnimalForPianoKey(notes[2]),
      ]
      this.buffer = [] // Reset buffer after firing to prevent immediate re-triggering
      return { notes, harmonies, animals }
    }

    return null
  }

  reset(): void {
    this.buffer = []
  }
}
```

### 4.2 `src/modes/choralEchoQueue.ts`

Extends the pattern of `EchoQueue` in `src/challenges/rewards.ts` for multi-step choral phrases.

```ts
export interface ChoralEchoOptions {
  responseDelayMs: number
  stepIntervalMs: number
  echoGain: number
}

export type ChoralStepCallback = (
  noteIndex: number,
  harmonyIndex: number,
  animal: AnimalFaceKind,
  gain: number,
  stepNumber: number,
) => void

/**
 * Manages the timing and cancellation of a 3-note choral response.
 * Strictly capped to 1 active sequence at any time.
 */
export class ChoralEchoQueue {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()
  private active = false

  constructor(
    private readonly onStep: ChoralStepCallback,
    private readonly options: ChoralEchoOptions,
  ) {}

  get isBusy(): boolean {
    return this.active || this.timers.size > 0
  }

  schedulePhrase(phrase: ChoralPhrase): void {
    // If an echo is already pending or playing, cancel and replace cleanly
    this.cancel()
    this.active = true

    const { responseDelayMs, stepIntervalMs, echoGain } = this.options

    for (let i = 0; i < phrase.notes.length; i++) {
      const delay = responseDelayMs + i * stepIntervalMs
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        try {
          this.onStep(phrase.notes[i], phrase.harmonies[i], phrase.animals[i], echoGain, i)
        } catch {
          /* Swallowed: audio failure must never interrupt gameplay */
        }
        if (i === phrase.notes.length - 1) {
          this.active = false
        }
      }, delay)
      this.timers.add(timer)
    }
  }

  cancel(): void {
    for (const timer of this.timers) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.active = false
  }
}
```

### 4.3 `src/companion/thoughtBubbleLogic.ts`

Pure TypeScript matching engine for Sago Mini-style visual requests.

```ts
import type { ShapeKey } from '../textures'
import type { AnimalFaceKind } from '../modes/pianoChoralLogic'

export type ThoughtTarget =
  | { kind: 'shape'; shape: ShapeKey; colorIndex?: number }
  | { kind: 'color'; colorIndex: number }
  | { kind: 'animal'; animal: 'dinosaur' | 'shark' | AnimalFaceKind }
  | { kind: 'note'; noteIndex: number; colorIndex: number }

export interface ThoughtMatchEvent {
  shape?: ShapeKey | string
  colorIndex?: number
  animal?: 'dinosaur' | 'shark' | AnimalFaceKind | string
  noteIndex?: number
  char?: string
}

/** Pure matcher: checks if the player's action matches the current thought target. */
export function checkThoughtMatch(target: ThoughtTarget, action: ThoughtMatchEvent): boolean {
  switch (target.kind) {
    case 'color':
      return action.colorIndex !== undefined && action.colorIndex === target.colorIndex
    case 'shape':
      if (action.shape !== target.shape) return false
      if (target.colorIndex !== undefined) {
        return action.colorIndex === target.colorIndex
      }
      return true
    case 'animal':
      if (action.animal === target.animal) return true
      if (target.animal === 'dinosaur' && action.char === 'D') return true
      if (target.animal === 'shark' && action.char === 'S') return true
      return false
    case 'note':
      return action.noteIndex !== undefined && action.noteIndex === target.noteIndex
  }
}

/** Picks a new thought target tailored to the active game mode, avoiding immediate repeats. */
export function pickNextThoughtTarget(
  prevTarget: ThoughtTarget | null,
  game: 'smash' | 'piano' | 'drawing',
  paletteLength: number,
  rng: () => number,
): ThoughtTarget {
  const shapes: ShapeKey[] = ['star', 'heart', 'circle', 'triangle', 'square', 'ring']
  const animals: ('dinosaur' | 'shark')[] = ['dinosaur', 'shark']

  let candidate: ThoughtTarget
  for (let attempt = 0; attempt < 10; attempt++) {
    const roll = rng()
    if (game === 'piano') {
      if (roll < 0.6) {
        const noteIndex = Math.floor(rng() * 5) // root pentatonic octave
        candidate = { kind: 'note', noteIndex, colorIndex: noteIndex % paletteLength }
      } else {
        const animalList: AnimalFaceKind[] = ['frog', 'kitten', 'bird', 'puppy']
        candidate = { kind: 'animal', animal: animalList[Math.floor(rng() * animalList.length)] }
      }
    } else if (game === 'drawing') {
      if (roll < 0.5) {
        candidate = { kind: 'color', colorIndex: Math.floor(rng() * paletteLength) }
      } else {
        candidate = { kind: 'shape', shape: shapes[Math.floor(rng() * shapes.length)] }
      }
    } else {
      // Smash mode
      if (roll < 0.4) {
        candidate = {
          kind: 'shape',
          shape: shapes[Math.floor(rng() * shapes.length)],
          colorIndex: Math.floor(rng() * paletteLength),
        }
      } else if (roll < 0.7) {
        candidate = { kind: 'color', colorIndex: Math.floor(rng() * paletteLength) }
      } else {
        candidate = { kind: 'animal', animal: animals[Math.floor(rng() * animals.length)] }
      }
    }

    if (!prevTarget || JSON.stringify(candidate) !== JSON.stringify(prevTarget)) {
      return candidate
    }
  }

  return { kind: 'shape', shape: 'star', colorIndex: 0 }
}
```

---

## 5. Procedural Graphics & Audio Synthesis Specifications

### 5.1 Procedural Animal Faces (`src/animalTextures.ts`)
Add high-resolution, cute vector drawings rendered via Canvas2D/Phaser Graphics:
1. `drawFrogFace(g, palette, singing: boolean)`
   - Round head, protruding upper eye domes with white sclera and smiling pupils.
   - Rosy cheeks (`0xf3a188`).
   - Mouth: wide smiling curve when normal, round happy singing "O" when `singing === true`.
2. `drawKittenFace(g, palette, singing: boolean)`
   - Round cheeks, pointed triangular ears with soft pink inner ear patches.
   - Three delicate whiskers on each side.
   - Smiling mouth or open singing mouth with pink tongue.
3. `drawBirdFace(g, palette, singing: boolean)`
   - Round head with a tuft of feathers on top.
   - Big round eye with a cute white sparkle circle.
   - Triangular beak: closed smile vs wide open singing beak.
4. `drawPuppyFace(g, palette, singing: boolean)`
   - Drooping floppy ears on both sides.
   - Soft rounded snout with dark button nose.
   - Open smiling mouth with little tongue.

Textures baked in `createAnimalTextures()`:
- `animalFace-frog`, `animalFace-frog-sing`, `animalFace-frog-night`, `animalFace-frog-sing-night`
- `animalFace-kitten`, `animalFace-kitten-sing`, `animalFace-kitten-night`, `animalFace-kitten-sing-night`
- `animalFace-bird`, `animalFace-bird-sing`, `animalFace-bird-night`, `animalFace-bird-sing-night`
- `animalFace-puppy`, `animalFace-puppy-sing`, `animalFace-puppy-night`, `animalFace-puppy-sing-night`

### 5.2 Procedural Thought Bubble Textures (`src/textures.ts` & `src/animalTextures.ts`)
- `thoughtBubble`: 128×96 px rounded multi-lobed cloud shape in pure white with soft border.
- `thoughtDot`: 32×32 and 16×16 circular dots forming the visual trail to the companion.
- `companion-dino`: 128×128 adorable procedural baby dinosaur sitting happily.

### 5.3 Choral Audio Voice (`src/audio.ts`)
Extend `Voice`:
```ts
export type Voice = 'blip' | 'piano' | 'dinosaur' | 'bubble' | 'choral'
```
Implement `playChoral(ctx: AudioContext, master: GainNode, freq: number, level: number)`:
- Two sine oscillators slightly detuned (e.g. $+3.5\text{ cents}$ and $-3.5\text{ cents}$) to produce an organic, warm acoustic chorus effect.
- Gentle vibrato (LFO at 4.5 Hz, depth 4 Hz) kicking in after 60 ms.
- Attack: 35 ms (soft, vocal-like).
- Decay: 450 ms exponential ramp down to silence.
- Polyphony tracking: Increments `this.voices`, hooks `onended` to decrement and cleanly disconnect nodes.

---

## 6. Piano Mode Integration (`src/modes/piano.ts`)

### 6.1 Key Interface Enhancement
```ts
interface PianoKey {
  img: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  face: Phaser.GameObjects.Image       // Procedural animal face stamp
  animal: AnimalFaceKind
  x: number
  top: number
  restY: number
  labelY: number
  faceY: number
}
```

### 6.2 Key Entrance & Animation
- In `buildKeys(ctx)`:
  - Stamped at `faceY = top + keyH * 0.38`.
  - Sized at `faceSize = Math.min(keyW * 0.52, 44)`.
  - Tint follows daytime/nighttime mood.
  - Drops into place alongside `key.img` and `key.label`.
- In `playKey(i, ctx, gainScale)`:
  - `key.face` dips with `img` and `label` (`y: '+=12', yoyo: true, duration: 80`).
  - Face squashes briefly (`scaleX: 1.15, scaleY: 0.85`).
- In `playChoralEcho(i, harmonyI, animal, gainScale)`:
  - Dips the key smoothly.
  - Temporarily sets face texture to `animalFace-[animal]-sing`.
  - Plays `ctx.synth.play(i, 'choral', gainScale)` and `ctx.synth.play(harmonyI, 'choral', gainScale * 0.8)`.
  - Spawns a floating musical note and sparkles from `ctx.pool`.

---

## 7. Thought Companion Controller (`src/companion/thoughtCompanion.ts`)

### 7.1 Visual Layout & Structure
- Lives in `PlayScene` as `private thoughtCompanion?: ThoughtCompanion`.
- Upper-left corner:
  - `x = insets.left + 54`
  - `y = insets.top + 76`
  - Completely non-intrusive, clear of child switcher (top-right) and edge logo (top-center).
- Container holds:
  - Companion body image (`companion-dino`).
  - Thought bubble cloud image (`thoughtBubble`).
  - Thought bubble trail dots (`thoughtDot`).
  - Target icon image (`star`, `note`, `heart`, animal face, etc.).

### 7.2 Matching & Celebration Sequence
```ts
if (checkThoughtMatch(this.target, event)) {
  this.celebrate()
}
```
1. **Backflip Tween**:
   - `scene.tweens.add({ targets: companion, y: '-=36', angle: 360, duration: 480, ease: 'Back.easeOut' })`
2. **Eating the Icon**:
   - `scene.tweens.add({ targets: targetIcon, x: companion.x, y: companion.y, scale: 0, duration: 320, ease: 'Quad.easeIn' })`
   - Play blip/pop sound on completion.
3. **Sparkle Shower**:
   - Spawn 8-10 pooled stars/dots from `ctx.pool.spawn('star', ...)` radiating outward.
   - Ascending pentatonic chime: `ctx.synth.chime()`.
4. **Respawn Thought**:
   - After 1500 ms, next thought target picked via `pickNextThoughtTarget`.
   - Bubble pops back into view with a playful bouncy scale tween (`scale: 1, ease: 'Back.easeOut'`).

---

## 8. Tunable Configuration (`src/config.ts`)

Add configuration blocks to `CONFIG`:

```ts
  /** Sago Mini-style non-punitive pictorial thought bubbles. */
  thoughtBubble: {
    idleBobMs: 1600,
    idleDriftPx: 5,
    autoCycleMs: 25000,
    celebrateMs: 480,
    sparkleCount: 8,
    targetScale: 0.38,
  },

  /** Harmonic call-and-response sound toys. */
  choralEcho: {
    phraseMaxGapMs: 1200,
    phraseLen: 3,
    responseDelayMs: 550,
    stepIntervalMs: 280,
    echoGain: 0.45,
    harmonyInterval: 2, // pentatonic third
  },
```

---

## 9. File-by-File Modification Plan

| File | Status | Description of Changes |
| :--- | :--- | :--- |
| `src/config.ts` | Modify | Add `thoughtBubble` and `choralEcho` configuration sections. |
| `src/audio.ts` | Modify | Add `'choral'` to `Voice` type and implement `playChoral()` dual-sine choral synthesis. |
| `src/animalTextures.ts` | Modify | Add procedural frog, kitten, bird, puppy faces (normal + sing) + companion dino. |
| `src/textures.ts` | Modify | Add procedural `thoughtBubble` and `thoughtDot` cloud textures. |
| `src/modes/pianoChoralLogic.ts` | **Create** | Pure logic: animal-to-key mapping, pentatonic harmony math, `ChoralPhraseDetector`. |
| `src/modes/pianoChoralLogic.test.ts` | **Create** | Vitest unit tests for animal mapping, harmony calculation, phrase detection and timeouts. |
| `src/modes/choralEchoQueue.ts` | **Create** | Capped, cancellable queue for multi-step choral call-and-response echoes. |
| `src/modes/choralEchoQueue.test.ts` | **Create** | Vitest tests for queue scheduling, step callbacks, cancellations, and polyphony ceiling. |
| `src/modes/piano.ts` | Modify | Stamp animal faces on keys, connect `ChoralPhraseDetector` and `ChoralEchoQueue`, trigger singing animations. |
| `src/companion/thoughtBubbleLogic.ts` | **Create** | Pure logic: `ThoughtTarget`, `checkThoughtMatch`, `pickNextThoughtTarget`. |
| `src/companion/thoughtBubbleLogic.test.ts` | **Create** | Vitest tests for matching accuracy, non-punitive behavior, target generation per game. |
| `src/companion/thoughtCompanion.ts` | **Create** | Visual companion & thought bubble controller (Phaser presentation, backflips, eating, sparkles). |
| `src/scenes/PlayScene.ts` | Modify | Instantiate `ThoughtCompanion`, route smash events to thought matcher, pause on parent panel. |
| `vitest.config.ts` | Modify | Include new pure logic files in coverage thresholds (`pianoChoralLogic.ts`, `choralEchoQueue.ts`, `thoughtBubbleLogic.ts`). |
| `scripts/screenshot.mjs` | Modify | Add Playwright verification for thought bubble companion and piano animal keys. |

---

## 10. Toddler Defense & Edge Cases

1. **Uncontrolled Forearm Mashing**:
   - Toddlers leaning a forearm across 10 keys simultaneously.
   - Handled: `ChoralPhraseDetector` requires notes separated by timestamps; rapid simultaneous inputs are safely handled, and `choralEchoQueue.cancel()` ensures pending echoes are canceled immediately if a mash barrage begins.
2. **Audio Voice Overflow (Polyphony Guard)**:
   - Synth voice ceiling is 8. Choral echoes consume only 2 voices and run at reduced gain (0.45). If all voices are busy, `play()` returns safely without throwing or distorting.
3. **No Wrong Notes / Negative Feedback**:
   - Zero dissonant notes: harmonies are strictly pentatonic (+2 scale degrees).
   - Zero error states in thought bubble: ignoring the bubble never shows a failure icon, buzzer, or sad face.
4. **Clean Teardowns on Mode Switch / Resize / Mood Change**:
   - Switching from Piano to Drawing cancels any pending choral echo timers.
   - Resizing the window recalculates companion position based on `safeAreaInsets()`.
   - Bedtime mood automatically swaps animal textures to soft nocturnal palettes and lowers choral volume/octave.
5. **No Memory Leaks**:
   - All sparkle and confetti rewards use `ctx.pool.spawn` and `ctx.pool.retire`.
   - Never call `scene.add.image` dynamically during play. Permanent key face stamps are created once in `enter()` and destroyed in returned cleanup.

---

## 11. Vitest Unit Test & Coverage Strategy

The repository strictly enforces >=90% line/statement coverage and >=85% branch/function coverage on all logic modules in `vitest.config.ts`.

### 11.1 Test Coverage Details
1. `src/modes/pianoChoralLogic.test.ts`:
   - `getAnimalForPianoKey`: verifies key 0 -> frog, 1 -> kitten, 2 -> bird, 3 -> puppy, negative indices, indices up to 20.
   - `calculatePentatonicHarmony`: verifies scale step intervals (0 -> 2, 4 -> 6, etc.).
   - `ChoralPhraseDetector`:
     - Emits phrase when 3 notes are entered within `maxGapMs`.
     - Returns `null` when only 1 or 2 notes entered.
     - Resets buffer when elapsed time exceeds `maxGapMs`.
     - Rejects notes marked `isEcho: true`.
     - Resets properly on explicit `reset()`.
2. `src/modes/choralEchoQueue.test.ts`:
   - Uses `vi.useFakeTimers()`.
   - Verifies 3 callbacks fired at exact configured delays ($t_0 = 550\text{ms}$, $t_1 = 830\text{ms}$, $t_2 = 1110\text{ms}$).
   - Verifies `cancel()` completely prevents subsequent step callbacks.
   - Verifies replacement of an active phrase by a new phrase without timer leaks.
3. `src/companion/thoughtBubbleLogic.test.ts`:
   - Matching color targets against color-bearing events.
   - Matching shape targets with and without color constraints.
   - Matching animal targets (including 'D' and 'S' shortcuts).
   - Matching note targets in Piano mode.
   - Non-matching events return `false` cleanly.
   - Target generation creates valid targets for Smash, Piano, and Drawing.
   - Target generation avoids consecutive duplicates.

---

## 12. Verification & Execution Steps

1. **Step 1: Pure Logic & Unit Tests**:
   - Implement `src/modes/pianoChoralLogic.ts`, `src/modes/choralEchoQueue.ts`, `src/companion/thoughtBubbleLogic.ts`.
   - Write accompanying test suites (`*.test.ts`).
   - Add modules to `vitest.config.ts`.
   - Run `npm test` and `npm run test:coverage` to verify 100% pass and coverage above thresholds.
2. **Step 2: Procedural Textures & Audio Timbre**:
   - Implement animal face drawing functions in `src/animalTextures.ts`.
   - Implement thought bubble textures in `src/textures.ts`.
   - Implement `'choral'` synth voice in `src/audio.ts`.
   - Add unit test in `src/audio.test.ts` for `'choral'` voice option.
3. **Step 3: Piano Integration**:
   - Add animal face stamps to `src/modes/piano.ts`.
   - Wire `ChoralPhraseDetector` and `ChoralEchoQueue` to piano key presses.
   - Animate singing expressions and dipping keys during echoes.
4. **Step 4: Thought Companion Controller**:
   - Implement `src/companion/thoughtCompanion.ts`.
   - Wire into `src/scenes/PlayScene.ts` during free play.
   - Connect smash and key events to thought matching.
   - Implement celebration backflip, eating animation, and pooled sparkle rewards.
5. **Step 5: Full System Verification**:
   - `npm run typecheck` (must pass with 0 errors).
   - `npm test` and `npm run test:coverage`.
   - `npm run shot` (Playwright headless Chromium pass; read screenshots `shots/piano.png`, `shots/latest.png`, `shots/mobile-piano.png`, ensure zero console errors).
