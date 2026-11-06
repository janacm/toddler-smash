# Implementation Plan: Technique 1 (Disproportionate Juice & Combo Pitch Arpeggios) & Technique 7 (Bedtime Sensory Downregulation)

## Executive Summary

This plan specifies the implementation of **Technique 1 (Disproportionate Juice & Combo Pitch Arpeggios)** and **Technique 7 (Bedtime Sensory Downregulation)** for `toddler-smash`.

The game serves 2-to-4-year-olds who cannot read, cannot be instructed, and will mash controls relentlessly. Everything must remain consonant, error-free, non-blocking, and procedurally generated.

- **Technique 1 (Disproportionate Juice & Combo Pitch Arpeggios)**: Rapid consecutive taps within a sliding time window (configurable in `CONFIG.combo`) build a combo streak that ascends through a musical pentatonic arpeggio in `audio.ts` (e.g., C4 → D4 → E4 → G4 → A4 → C5). At combo peak (e.g., 5–6 hits), a **crescendo celebration** fires with an exaggerated visual ripple, a shimmering particle burst, and a warm, consonant pentatonic chord, before smoothly resetting. Soft, organic, rate-limited audio cues provide tactile acoustic feedback on collisions and retirements.
- **Technique 7 (Bedtime Sensory Downregulation)**: Bedtime mood introduces gentler audio envelopes with softened attack times (80 ms vs 12 ms) and attenuated harmonic overtones (whisper-quiet fundamental sine waves), paired with calmer particle physics (reduced burst speed and spin) and longer, floaty decay times for a tranquil bedtime experience.
- **Pure Logic Separation**: Combo streak tracking, sliding window expiry, arpeggio progression, and chord indices are isolated into `src/combo.ts` (Phaser-free and WebAudio-free) with 100% Vitest unit test coverage in `src/combo.test.ts`.

---

## 1. Architectural Blueprint & Data Flow

```
User Input (Keyboard / Touch / Mouse)
                     │
                     ▼
          PlayScene.handleSmash(e)
                     │
                     ├───► ComboTracker.hit(now) ───► ComboHit { count, step, isPeak, ratio }
                     │          (src/combo.ts - pure logic)
                     │
                     ├───► If isPeak:
                     │       ├── PlayScene.celebrateCombo(e, ctx)
                     │       │     ├── Exaggerated multi-ring ripple (pooled)
                     │       │     └── Shimmering star/dot burst (pooled)
                     │       └── ctx.synth.playWarmChord()
                     │
                     ├───► ToyContext { ..., combo: ComboHit, mood: Mood }
                     │
                     ▼
       playSmash(e, ctx, mode.toys)
        │
        ├──► shapeBurst:
        │      ├── Uses mood.motion (speedScale, spinScale) & mood.decay.shapeMs
        │      ├── Audio: ctx.synth.playArpeggio(ctx.combo.step)
        │      └── Floor Bounce: ctx.synth.playCue('bounce')
        │
        ├──► ripple:
        │      ├── Scales ring size with ctx.combo.ratio
        │      ├── Uses mood.decay.rippleMs
        │      └── Audio: ctx.synth.playArpeggio(ctx.combo.step)
        │
        └──► letterPop:
               ├── Upward drift duration follows mood.decay.glyphMs
               └── Audio: ctx.synth.play(baseNote + ctx.combo.step)
```

---

## 2. Component Specifications

### 2.1 Pure Logic Engine: `src/combo.ts`

`src/combo.ts` contains zero Phaser or WebAudio dependencies. It handles the sliding time window, streak counting, arpeggio step mapping, crescendo peak detection, and chord index generation.

#### Interfaces & Types

```ts
export interface ComboConfig {
  /** Sliding window in ms; inputs within this window advance the combo. */
  windowMs: number
  /** Number of hits to reach the crescendo peak celebration (e.g. 6). */
  maxCombo: number
  /** Minimum delay between hits in ms to reject micro-jitter / duplicate timestamps. */
  minIntervalMs?: number
}

export interface ComboHit {
  /** Current consecutive hit count, 1-indexed (1..maxCombo). */
  count: number
  /** Arpeggio step index, 0-indexed (0..maxCombo - 1). */
  step: number
  /** True when this hit reaches maxCombo (triggers crescendo celebration). */
  isPeak: boolean
  /** Progress toward peak [1/maxCombo .. 1.0], used to scale visual juice. */
  ratio: number
  /** True if this hit started a new combo streak (fresh start or after peak). */
  isFirst: boolean
}

export interface ComboState {
  count: number
  step: number
  ratio: number
  active: boolean
}
```

#### Core Logic

```ts
export class ComboTracker {
  private count = 0
  private lastTime = 0

  constructor(private readonly config: ComboConfig) {}

  /**
   * Process a hit at timestamp `now` (ms, e.g. performance.now()).
   * Returns details about the hit and advances internal state.
   */
  hit(now: number): ComboHit {
    const minInterval = this.config.minIntervalMs ?? 30
    if (this.lastTime > 0 && now - this.lastTime < minInterval) {
      // Jitter protection: retain current state without advancing step
      return this.currentHit(false)
    }

    const elapsed = now - this.lastTime
    const expired = this.lastTime === 0 || elapsed > this.config.windowMs

    if (expired || this.count >= this.config.maxCombo) {
      this.count = 1
      this.lastTime = now
      return {
        count: 1,
        step: 0,
        isPeak: false,
        ratio: 1 / this.config.maxCombo,
        isFirst: true,
      }
    }

    this.count++
    this.lastTime = now
    const step = this.count - 1
    const isPeak = this.count >= this.config.maxCombo

    return {
      count: this.count,
      step,
      isPeak,
      ratio: this.count / this.config.maxCombo,
      isFirst: false,
    }
  }

  /** Current state snapshot without advancing counters. */
  getState(now: number): ComboState {
    if (this.lastTime === 0 || now - this.lastTime > this.config.windowMs) {
      return { count: 0, step: 0, ratio: 0, active: false }
    }
    return {
      count: this.count,
      step: Math.max(0, this.count - 1),
      ratio: this.count / this.config.maxCombo,
      active: true,
    }
  }

  /** Reset combo state immediately (e.g. on mode switch or panel open). */
  reset(): void {
    this.count = 0
    this.lastTime = 0
  }

  private currentHit(isFirst: boolean): ComboHit {
    const count = Math.max(1, this.count)
    return {
      count,
      step: Math.max(0, count - 1),
      isPeak: count >= this.config.maxCombo,
      ratio: count / this.config.maxCombo,
      isFirst,
    }
  }
}

/**
 * Maps a combo step to an ascending pentatonic note index.
 * Keeps all notes on the consonant scale.
 */
export function comboNoteIndex(step: number, baseIndex = 0, noteCount = 15): number {
  return ((baseIndex + step) % noteCount + noteCount) % noteCount
}

/**
 * Returns pentatonic scale table indices for a warm, consonant major chord
 * (e.g. Root, Major 3rd, 5th, Octave: indices 0, 2, 3, 5).
 * Strictly pentatonic, consonant, and exactly 4 voices (safe under maxVoices = 8).
 */
export function comboChordIndices(baseIndex = 0): number[] {
  return [baseIndex, baseIndex + 2, baseIndex + 3, baseIndex + 5]
}
```

---

### 2.2 Configuration Schema: `src/config.ts`

Tuneable numbers for combo, celebrations, soft cues, and bedtime sensory downregulation:

```ts
export const CONFIG = {
  limits: {
    maxSprites: 140,
    maxVoices: 8,
  },

  /** Fallback base lifetimes; mood.decay takes precedence when available. */
  lifetime: {
    glyphMs: 2600,
    shapeMs: 2200,
    rippleMs: 900,
  },

  /** Fallback base motion; mood.motion takes precedence when available. */
  motion: {
    gravity: 420,
    burstSpeedMin: 180,
    burstSpeedMax: 460,
    spinMax: 220,
    bounceDamping: 0.62,
  },

  /** Combo progression and crescendo peak settings. */
  combo: {
    windowMs: 900,
    maxCombo: 6,
    minIntervalMs: 35,
    celebration: {
      rings: 4,
      shimmerCount: 10,
    },
  },

  audio: {
    scaleSemitones: [0, 2, 4, 7, 9],
    rootHz: 261.63, // middle C
    octaves: 3,
    /** Minimum ms between soft organic audio cues (prevents mash click spam). */
    cueThrottleMs: 140,
  },

  // ... piano, challenges, drawing, splash, parentEscape ...

  moods: {
    daytime: {
      label: 'Daytime',
      panelKey: 'D',
      background: { top: 0xdcefff, bottom: 0xfdf3e1 },
      hintColor: '#7a86a8',
      palette: [0xe63946, 0xf77f00, 0xe0a800, 0x2a9d8f, 0x43aa52, 0x277da1, 0x7b2cbf, 0xd6336c],
      timeScale: 0.9,
      minSpawnIntervalMs: 45,
      night: false,
      audio: {
        volume: 0.24,
        wave: 'triangle',
        noteMs: 620,
        pianoMs: 1400,
        octaveShift: 0,
        attackMs: 12,        // Snappy, responsive attack
        harmonicGain: 0.25,  // Rich body overtone
      },
      motion: {
        speedScale: 1.0,
        spinScale: 1.0,
        bounceScale: 1.0,
      },
      decay: {
        glyphMs: 2600,
        shapeMs: 2200,
        rippleMs: 900,
      },
    },
    bedtime: {
      label: 'Bedtime',
      panelKey: 'B',
      background: { top: 0x0b1030, bottom: 0x1d1747 },
      hintColor: '#4b5384',
      palette: [0xf4a7b9, 0xf6c28b, 0xf3e3a0, 0xa8e6cf, 0x9ad0ec, 0xb8b5ff, 0xd7bde2, 0x8fd3c7],
      timeScale: 0.5,
      minSpawnIntervalMs: 160,
      night: true,
      audio: {
        volume: 0.13,
        wave: 'sine',
        noteMs: 1200,
        pianoMs: 2200,
        octaveShift: -1,
        attackMs: 80,        // Soft, pillowy swell; no clicking attack
        harmonicGain: 0.04,  // Attenuated overtone; pure fundamental warmth
      },
      motion: {
        speedScale: 0.55,    // Calmer, gentle burst speeds
        spinScale: 0.3,      // Tranquil, floaty rotation
        bounceScale: 0.35,   // Soft settle on floor contact
      },
      decay: {
        glyphMs: 3800,       // Lingering peaceful visual presence
        shapeMs: 3400,
        rippleMs: 1400,
      },
    },
  },
} as const
```

*Schema Invariant*: Both `daytime` and `bedtime` define identical top-level keys (`audio`, `background`, `decay`, `hintColor`, `label`, `minSpawnIntervalMs`, `motion`, `night`, `palette`, `panelKey`, `timeScale`) and identical audio sub-keys (`attackMs`, `harmonicGain`, `noteMs`, `octaveShift`, `pianoMs`, `volume`, `wave`). This preserves `config.test.ts` shape parity.

---

### 2.3 Audio Synthesizer: `src/audio.ts`

#### Enhancements to `Synth`

1. **Configurable Attack & Harmonic Gain**:
   In `play(...)`:
   ```ts
   const attackSec = (this.mood.attackMs ?? 12) / 1000
   gain.gain.linearRampToValueAtTime(0.9 * level, now + attackSec)
   ...
   const harmonicGain = this.mood.harmonicGain ?? 0.25
   gain2.gain.value = harmonicGain
   ```
2. **Ascending Pentatonic Arpeggio**:
   ```ts
   /**
    * Play note `step` in an ascending pentatonic arpeggio sequence.
    * Automatically wraps notes within noteTable bounds.
    */
   playArpeggio(step: number, voice: Voice = 'blip', gainScale = 1): void {
     const base = Math.floor(this.noteTable.length * 0.2) // middle octave
     this.play(base + step, voice, gainScale)
   }
   ```
3. **Warm Pentatonic Chord (Crescendo Celebration)**:
   ```ts
   /**
    * Play a warm pentatonic chord (e.g. Root, 3rd, 5th, Octave) staggered
    * slightly (24ms) like an acoustic strum. Stays within maxVoices.
    */
   playWarmChord(baseIndex = 0, gainScale = 0.85): void {
     const indices = comboChordIndices(baseIndex)
     indices.forEach((noteIdx, i) => {
       window.setTimeout(() => {
         this.play(noteIdx, 'blip', gainScale * 0.6)
       }, i * 24)
     })
   }
   ```
4. **Soft Organic Audio Cues (Collisions & Retirements)**:
   ```ts
   private lastCueTime = 0

   /**
    * Plays a gentle, throttled acoustic cue for physical events (e.g. bounce, fade).
    * Subdued in Bedtime to protect calmness.
    */
   playCue(type: 'bounce' | 'retire', gainScale = 0.2): void {
     const now = performance.now()
     if (now - this.lastCueTime < CONFIG.audio.cueThrottleMs) return
     this.lastCueTime = now

     const note = type === 'bounce' ? 2 : 7
     const voice = type === 'bounce' ? 'bubble' : 'blip'
     const moodFactor = this.mood.volume / CONFIG.moods.daytime.audio.volume
     this.play(note, voice, gainScale * moodFactor)
   }
   ```

---

### 2.4 Visual Juice & Crescendo Celebration: `PlayScene.ts`

#### Integration in `PlayScene`

1. **State Ownership**:
   - `private comboTracker = new ComboTracker(CONFIG.combo)`
2. **On Smash (`handleSmash`)**:
   ```ts
   const comboHit = this.comboTracker.hit(performance.now())

   if (comboHit.isPeak) {
     this.celebrateCombo(e, this.context(comboHit))
     this.synth.playWarmChord(0)
   }

   playSmash(e, this.context(comboHit), this.mode.toys)
   ```
3. **Celebration Choreography (`celebrateCombo`)**:
   - **Exaggerated Ripple**:
     Spawn `CONFIG.combo.celebration.rings` (4 rings) from `ctx.pool.spawn('ring', e.x, e.y)`:
     - Scales from 0.2 to 4.5–6.0.
     - Staggered delays: `i * 90` ms.
     - Alpha fades from 0.95 to 0.
     - Retires safely into sprite pool on tween complete.
   - **Particle Shimmer**:
     Spawn `CONFIG.combo.celebration.shimmerCount` (10 items) alternating between `'star'` and `'dot'`:
     - Spawns at `(e.x, e.y)` using `ctx.pool.spawn(...)`.
     - Radial outward velocities (angles 0 to 2π).
     - Pulsing scale tweens (`Sine.easeInOut`).
     - Palette tints via `ctx.color(e.index + i)`.
     - Retired via `ctx.pool.retire(p, 700, 350)`.
4. **Clean Reset Hooks**:
   - `setMode`: `this.comboTracker.reset()`
   - `setMood`: `this.comboTracker.reset()`
   - `toggleParentPanel`: `this.comboTracker.reset()`
   - `resetProgress`: `this.comboTracker.reset()`

---

### 2.5 Toy & Bedtime Physics Integration

#### `src/toys/types.ts`
Extend `ToyContext` with `combo: ComboHit` and `mood: Mood` so all toys access streak juice and mood physics without ad-hoc imports:
```ts
export interface ToyContext {
  scene: Phaser.Scene
  pool: SpritePool
  text: TextPool
  synth: Synth
  rng: Phaser.Math.RandomDataGenerator
  width: number
  height: number
  color(seed?: number): number
  combo: ComboHit
  mood: Mood
}
```

#### `src/toys/shapeBurst.ts`
1. **Motion Scaling**:
   ```ts
   const motion = ctx.mood.motion
   const speed = ctx.rng.between(CONFIG.motion.burstSpeedMin, CONFIG.motion.burstSpeedMax) * motion.speedScale
   const spin = CONFIG.motion.spinMax * motion.spinScale
   const bounceDamp = CONFIG.motion.bounceDamping * motion.bounceScale
   const shapeMs = ctx.mood.decay.shapeMs
   ```
2. **Combo Arpeggio Audio**:
   Replace random note selection with `ctx.synth.playArpeggio(ctx.combo.step)`.
3. **Collision Audio Cue**:
   On floor bounce `onComplete`: call `ctx.synth.playCue('bounce', 0.2)`.

#### `src/toys/ripple.ts`
1. **Juice Scaling**:
   Scale the outer ring radius by combo ratio:
   `scale: ctx.rng.realInRange(2.2, 3.8) * (1 + ctx.combo.ratio * 0.4)`
2. **Bedtime Decay**:
   `duration: ctx.mood.decay.rippleMs`
3. **Combo Arpeggio Audio**:
   Replace random note with `ctx.synth.playArpeggio(ctx.combo.step)`.

#### `src/toys/letterPop.ts`
1. **Bedtime Decay**:
   Upward drift duration uses `ctx.mood.decay.glyphMs`.
2. **Combo Tone**:
   Pitch shifts upward with combo step:
   `const note = Math.floor((e.x / ctx.width) * ctx.synth.noteCount) + ctx.combo.step`
   `ctx.synth.play(note)`

---

## 3. Testing Strategy

### 3.1 Unit Testing: `src/combo.test.ts`
New test suite covering pure logic in `src/combo.ts` without browser mocks:
- `ComboTracker`:
  - Hit 1 initializes combo (`count: 1, step: 0, isFirst: true, isPeak: false`).
  - Consecutive hits within `windowMs` increment count and step sequentially.
  - Reaching `maxCombo` flags `isPeak: true`.
  - Next hit after peak resets smoothly to `count: 1, step: 0, isFirst: true`.
  - Input arriving after `windowMs` expires resets streak to `count: 1`.
  - Micro-jitter (< `minIntervalMs`) maintains state without premature step advancement.
  - `reset()` wipes state immediately.
  - `getState(now)` returns accurate active/inactive snapshots.
- `comboNoteIndex`:
  - Wraps properly within note table bounds.
  - Ascends monotonically across steps.
- `comboChordIndices`:
  - Returns exactly 4 indices corresponding to root, 3rd, 5th, octave.
  - Indices map strictly to the pentatonic scale.

### 3.2 Unit Testing: `src/config.test.ts`
Updates to verify new config contracts:
- Parity of top-level mood keys (`decay`, `motion`, etc.) and `audio` keys (`attackMs`, `harmonicGain`).
- Bedtime calmer invariants:
  - `bedtime.audio.attackMs > daytime.audio.attackMs` (softer attack)
  - `bedtime.audio.harmonicGain < daytime.audio.harmonicGain` (fewer overtones)
  - `bedtime.motion.speedScale < daytime.motion.speedScale` (calmer burst speed)
  - `bedtime.motion.spinScale < daytime.motion.spinScale` (calmer spin)
  - `bedtime.decay.shapeMs > daytime.decay.shapeMs` (longer decay)
  - `bedtime.decay.glyphMs > daytime.decay.glyphMs`

### 3.3 Unit Testing: `src/audio.test.ts`
Updates to test WebAudio synthesis logic:
- `attackMs` respected when ramping gain (`linearRampToValueAtTime`).
- `harmonicGain` properly sets overtone oscillator gain.
- `playArpeggio` passes pentatonic notes to `play(...)`.
- `playWarmChord` schedules pentatonic chord voices within `maxVoices`.
- `playCue` respects `cueThrottleMs` and volume factors.

### 3.4 Coverage Enforcement: `vitest.config.ts`
Add `'src/combo.ts'` to `coverage.include`. Verify that coverage meets or exceeds the repository gates:
- Lines: ≥ 90%
- Statements: ≥ 90%
- Functions: ≥ 85%
- Branches: ≥ 85%

### 3.5 Screenshot & Visual Verification
Run `npm run shot` to photograph daytime smash (`latest.png`), bedtime smash (`bedtime.png`), and mobile touch interactions. Verify:
- Clean visuals without glitching or visual artifacts.
- Zero uncaught exceptions or console errors.

---

## 4. File Modification Index

| File | Change Scope |
|---|---|
| `src/combo.ts` | **New file**: Pure logic combo tracker, arpeggio note mapping, chord index generation. |
| `src/combo.test.ts` | **New file**: Complete unit test coverage for `src/combo.ts`. |
| `vitest.config.ts` | Add `'src/combo.ts'` to coverage include list. |
| `src/config.ts` | Add `CONFIG.combo`, `CONFIG.audio.cueThrottleMs`, mood audio envelopes (`attackMs`, `harmonicGain`), mood `motion`, and mood `decay`. |
| `src/config.test.ts` | Assert schema parity and calmness invariants for new bedtime parameters. |
| `src/audio.ts` | Support configurable attack/harmonic gain, `playArpeggio`, `playWarmChord`, and `playCue`. |
| `src/audio.test.ts` | Verify envelope attack, overtone gain, arpeggio, chord scheduling, and cue throttling. |
| `src/toys/types.ts` | Extend `ToyContext` with `combo: ComboHit` and `mood: Mood`. |
| `src/toys/shapeBurst.ts` | Use mood motion/decay, trigger `playArpeggio` on smash, and `playCue('bounce')` on floor bounce. |
| `src/toys/ripple.ts` | Scale rings by combo ratio, use mood decay, and trigger `playArpeggio`. |
| `src/toys/letterPop.ts` | Apply mood decay and transpose note by combo step. |
| `src/scenes/PlayScene.ts` | Manage `ComboTracker`, trigger crescendo celebration & warm chord on peak, reset on mode/mood/panel switch. |
| `docs/requirements.md` | Document combo pitch arpeggios (C5) and bedtime sensory downregulation (M2). |

---

## 5. Execution Waves & Verification Steps

```
Wave 1: Pure Logic Engine & Unit Tests
  ├─ Create src/combo.ts
  ├─ Create src/combo.test.ts
  ├─ Update vitest.config.ts
  └─ Verify: npm test src/combo.test.ts

Wave 2: Configuration & Invariants
  ├─ Update src/config.ts with combo, envelope, motion, decay configs
  ├─ Update src/config.test.ts
  └─ Verify: npm test src/config.test.ts

Wave 3: Audio Synthesis Enhancements
  ├─ Update src/audio.ts (attack ramp, harmonic gain, playArpeggio, playWarmChord, playCue)
  ├─ Update src/audio.test.ts
  └─ Verify: npm test src/audio.test.ts

Wave 4: Toy Context & PlayScene Integration
  ├─ Update src/toys/types.ts
  ├─ Update src/scenes/PlayScene.ts (combo tracker, celebrateCombo, resets)
  ├─ Update src/toys/play.ts and toys/play.test.ts if needed for context compatibility
  └─ Verify: npm run typecheck

Wave 5: Bedtime Downregulation & Toy Physics
  ├─ Update src/toys/shapeBurst.ts (motion scaling, arpeggio audio, bounce cue)
  ├─ Update src/toys/ripple.ts (juice scaling, bedtime decay, arpeggio audio)
  ├─ Update src/toys/letterPop.ts (decay scaling, combo pitch)
  └─ Verify: npm run typecheck && npm test

Wave 6: Documentation & Production Verification
  ├─ Update docs/requirements.md
  ├─ Run npm run test:coverage (check 90%+ gates)
  ├─ Run npm run build (Vite production bundle check)
  ├─ Run npm run shot (Playwright headless screenshot check + zero console error assertion)
  └─ Inspect shots/latest.png and shots/bedtime.png
```
