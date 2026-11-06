# Implementation Plan: Progressive Scratch-Off Unmasking & Visual Sticker Album

This plan details the architecture, design choices, data models, presentation components, testing strategy, and execution steps for implementing **Technique 2 (Progressive Scratch-Off Unmasking)** and **Technique 3 (Visual Sticker Album & Discovery Badges)** in `toddler-smash`.

---

## 1. Executive Summary

### 1.1 Goal
Provide toddlers (ages 2 and 4) with two deeply rewarding, intrinsically motivated discovery loops that require **zero reading, zero instructions, and zero failure states**:
1. **Technique 2: Progressive Scratch-Off Unmasking**: In Drawing mode, an underlying secret procedural illustration (dinosaur in a glade, ocean shark, or starlit night sky) is hidden under an erasable scratch-off mask. As toddlers scribble with one or more fingers, the mask is dynamically erased on a `Phaser.GameObjects.RenderTexture`. A mathematical grid in pure TypeScript monitors coverage. When ~75–80% is cleared, an **auto-bloom celebration** triggers: the mask dissolves, the artwork joyfully bounds to life, a pentatonic fanfare plays, and a shiny discovery badge pops out into the child's album.
2. **Technique 3: Visual Sticker Album & Discovery Tray**: A non-intrusive dock at the bottom of the screen (or docked above piano keys in Piano mode) displays discovered animated stamp badges (secret dinosaur, grinning shark, rainbow melody combo, scratch-off reveals). Tapping any collected badge causes it to bounce into the center of the screen, perform a victory dance with its synthesized animal/musical voice, and fly back to its slot. All discoveries are session-only (in-memory) and reset on reload or via the grown-up panel (`R`).

---

## 2. Core Repository Invariants & Design Principles

| Invariant | Application to this Feature |
| :--- | :--- |
| **No Text, No Scores, No Menus** | Badges have no labels, no percentage counters, and no locked text. Empty slots are soft, tactile silhouette discs; unlocked badges are gleaming, breathing stamps. |
| **100% Procedural Artwork** | Zero PNGs or JPEGs. All card illustrations (dinosaur glade, reef shark, star sky) and stamp badges are procedurally generated via Canvas2D / Phaser Graphics into textures. |
| **Pentatonic Sound Only** | Fanfares, auto-bloom chords, and badge victory sounds use the shared `Synth` on `CONFIG.audio.scaleSemitones` with voice capping (`maxVoices`). |
| **Sprite Pooling** | Particle bursts (sparkles, rings, stars) during celebrations use `ctx.pool.spawn` and `ctx.pool.retire`. Pooled sprites are never destroyed. |
| **Pure Logic in Vitest** | All coverage math (`ScratchGrid`), card playlist state (`ScratchCardModel`), and badge collection logic (`AlbumModel`) are isolated in `src/discovery/` without Phaser or DOM dependencies, achieving $\ge 90\%$ line and $\ge 85\%$ branch coverage. |
| **Clean Teardown** | All tweens, render textures, and timers are cleanly destroyed on mode switch, resize, mood change, and scene shutdown. |
| **Session-Only Persistence** | Progress is never stored in `localStorage` or `settings.ts`. It resets on reload or grown-up panel `R` (New player). |

---

## 3. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                     PlayScene                                     |
|  +-----------------------------------------------------------------------------+  |
|  |                             AlbumModel (Pure)                               |  |
|  |   - badges: Set<BadgeId>                                                    |  |
|  |   - discover(badgeId): boolean                                              |  |
|  |   - reset(): void                                                           |  |
|  +-----------------------------------------------------------------------------+  |
|            |                                              |                       |
|            v                                              v                       |
|  +---------------------------+             +-----------------------------------+  |
|  |   DiscoveryTray (Phaser)  |             |      Drawing Mode (ScratchCard)   |  |
|  | - Bottom / above piano    |             | - Base card: Illustration texture |  |
|  | - Displays badge stamps   |             | - Cover: maskRT (RenderTexture)   |  |
|  | - Tap -> Center victory   |             | - Pure ScratchCardModel (grid)    |  |
|  |   dance + animal voice    |             | - Auto-bloom at 75% coverage      |  |
|  +---------------------------+             +-----------------------------------+  |
|            ^                                              |                       |
|            | unlocks badge on celebration                 |                       |
|            +----------------------------------------------+                       |
|                                                                                   |
|  Triggers from other modes/toys:                                                  |
|  - Smash 'D' or Dino smash  -> album.discover('dinosaur')                         |
|  - Smash 'S' or Shark smash -> album.discover('shark')                            |
|  - Piano 5-note pentatonic  -> album.discover('rainbow')                          |
|  - Challenge tier complete  -> album.discover('starGarden')                       |
+-----------------------------------------------------------------------------------+
```

---

## 4. Detailed Component Design

### 4.1 Technique 2: Progressive Scratch-Off Unmasking

#### A. Pure Coverage Math (`src/discovery/scratchModel.ts` & `src/modes/drawingMath.ts`)
- Reading pixels from WebGL (`gl.readPixels`) causes massive GPU pipeline stalls and breaks on headless tests. Instead, we use an in-memory spatial grid of cells.
- **Grid Configuration**: $20 \times 16 = 320$ cells covering the normalized card area $[0, W] \times [0, H]$.
- **Cell Structure**: A flat `Uint8Array(cols * rows)`.
- **Scratch Operation**:
  - When the player dabs or strokes with radius $R$ at point $(x, y)$, calculate bounding cell range:
    $$\text{col}_{\min} = \max\left(0, \left\lfloor \frac{x - R}{cw} \right\rfloor\right), \quad \text{col}_{\max} = \min\left(C_x - 1, \left\lfloor \frac{x + R}{cw} \right\rfloor\right)$$
    $$\text{row}_{\min} = \max\left(0, \left\lfloor \frac{y - R}{ch} \right\rfloor\right), \quad \text{row}_{\max} = \min\left(C_y - 1, \left\lfloor \frac{y + R}{ch} \right\rfloor\right)$$
  - For each cell, if distance from cell center to $(x, y) \le R + \text{tolerance}$, set cell byte to `1` and increment `clearedCount`.
  - `coverage = clearedCount / totalCells`.
- **Segment Interpolation**:
  - For strokes between $(x_1, y_1)$ and $(x_2, y_2)$, `strokePoints` samples points spaced at most $\text{step} = R / 2$ apart.
  - Ensures continuous scratching with no gaps even during fast forearm swipes.
- **Coverage Threshold**:
  - Configurable via `CONFIG.discovery.coverageThreshold = 0.75` (75%).
  - Fast $O(1)$ check.

#### B. Procedural Illustrations (`src/discovery/illustrations.ts`)
Created via Phaser Graphics and baked into textures at boot:
1. `illustration-dino`: A cheerful T. Rex standing in a vibrant prehistoric landscape with rolling green hills, a smiling sun, fluffy clouds, and primitive ferns.
2. `illustration-shark`: A grinning reef shark swimming in a turquoise ocean among colorful corals, gentle sea floor ripples, and floating bubbles.
3. `illustration-sky`: A dreamy night scene with a sleepy crescent moon wearing a nightcap, a smiling cloud, and twinkling pentatonic star constellations.
4. `scratch-cover`: A soft pearlescent scratch coating texture with subtle golden speckles and faint question-mark glyphs that beckon a toddler to rub.

#### C. Presentation Component (`src/discovery/scratchCard.ts`)
- **Card Sizing & Layout**:
  - Centered on the canvas: $W \approx \min(ctx.width \times 0.65, 520)$, $H \approx \min(ctx.height \times 0.55, 380)$.
  - Bounded with a rounded frame that separates the scratch area from the free drawing space.
- **Layers**:
  - Layer 1 (Depth -180): Card backing and border graphics.
  - Layer 2 (Depth -175): The hidden `illustration` Image.
  - Layer 3 (Depth -170): `maskRT`, a `Phaser.GameObjects.RenderTexture` filled with `scratch-cover`.
- **Scratching**:
  - When Drawing's `extend` or `dab` runs, if the stroke intersects the card:
    - Transform $(x, y)$ to card-local coordinates.
    - Erase the mask: `maskRT.stamp(BRUSH, undefined, localX, localY, { scale, erase: true })`.
    - Update pure grid coverage in `scratchModel`.
- **Auto-Bloom Celebration Choreography**:
  - When `coverage >= 0.75` and not yet bloomed:
    1. **Celebration Lock**: Mark card as bloomed (prevent multiple triggers).
    2. **Mask Dissolve**: Tween `maskRT` alpha to $0$ over 450ms, revealing 100% of the artwork.
    3. **Artwork Bounce**: Illustration scales up with `Back.easeOut` (scale 1.0 $\to$ 1.15 $\to$ 1.0).
    4. **Particle Burst**: Spawns 16–20 pooled stars and rings radiating outwards from card center (`ctx.pool.spawn('star', ...)`).
    5. **Audio Fanfare**:
       - Plays an ascending pentatonic arpeggio: note indices $[0, 2, 4, 7, 9, 12]$.
       - If Dino card: triggers gentle dinosaur voice rumble (`ctx.synth.play(..., 'dinosaur')`).
       - If Shark card: triggers gentle bubble plop voice (`ctx.synth.play(..., 'bubble')`).
    6. **Badge Reward**: Emits event to `AlbumModel` unlocking the respective card badge (`scratchDino`, `scratchShark`, or `scratchSky`).
    7. **Card Cycle**: After a 3.5-second celebratory pause, the card smoothly ripples, advances to the next mystery card in the playlist, and resets the scratch mask.

---

### 4.2 Technique 3: Visual Sticker Album & Discovery Badges

#### A. Domain Model (`src/discovery/albumModel.ts`)
- Pure TypeScript class.
- **Registered Badges**:
  1. `dinosaur`: The Friendly Dinosaur (unlocked via 'D' key, Dino smash, or Dino scratch card).
  2. `shark`: The Grinning Shark (unlocked via 'S' key, Shark smash, or Shark scratch card).
  3. `rainbow`: The Rainbow Maestro (unlocked via 5-note pentatonic sequence in Piano or rainbow power in Drawing).
  4. `scratchDino`: Prehistoric Master (unlocked via Dino scratch-off bloom).
  5. `scratchShark`: Deep Sea Explorer (unlocked via Shark scratch-off bloom).
  6. `scratchSky`: Starry Dreamer (unlocked via Night Sky scratch-off bloom).
  7. `starGarden`: Star Connector (unlocked via Smash challenge completion).
- **API**:
  ```ts
  export class AlbumModel {
    discover(id: BadgeId): boolean // returns true if newly unlocked
    has(id: BadgeId): boolean
    getBadges(): readonly BadgeDefinition[]
    getUnlockedCount(): number
    reset(): void // cleans all badges for New Player
  }
  ```

#### B. Discovery Tray Presentation (`src/discovery/tray.ts`)
- **Dock Placement**:
  - Horizontal bar docked along the bottom edge, safe-area aware (`safeAreaInsets().bottom`).
  - **Piano Adaptation**: When in Piano mode, the tray automatically anchors just above the piano keys ($y = \text{height} \times (1 - \text{CONFIG.piano.heightFrac}) - \text{trayHeight} - 10$), avoiding any interference with piano keys.
- **Badge Stamp Appearance**:
  - Diameter: 48px on phones, 60px on desktop.
  - **Locked Slot**: Faint dashed outline disc with a soft question sparkle at $0.25$ alpha.
  - **Unlocked Stamp**:
    - Vibrant circular badge with golden rim.
    - Features the procedural character icon (dino, shark, rainbow, moon).
    - Subtle breathing animation (phase-shifted `scale: 1.0 <-> 1.06` over 2200ms).
- **Interactive Victory Dance**:
  - Toddlers can tap ANY unlocked badge in the tray at any time.
  - **Hit Detection**: `tray.hit(x, y)` in `PlayScene.handleAction`.
  - **Animation Choreography**:
    1. A clone preview sprite pops from the badge slot and tweens to screen center $(width / 2, height / 2)$ over 350ms with `Back.easeOut`.
    2. Scales to large size ($\approx 200\text{px}$).
    3. Executes its signature victory dance:
       - **Dinosaur**: Stomps, wiggles head and tail, emits 3 little footprint sprites, plays dinosaur voice rumble!
       - **Shark**: Swims in a joyful figure-8, spawns 4 bubbles floating upward, plays bubble synth voice!
       - **Rainbow**: Spins 360° with a cascade of colorful stars, plays ascending chime!
       - **Sky**: Glows and pulses, plays high sweet pentatonic notes!
    4. Tweens back to its tray slot and settles with a soft squash-and-stretch.
  - Interruption-safe: Tapping another badge or mashing safely concludes or cancels the active dance without leaking sprites or audio voices.

---

### 4.3 PlayScene Integration & Lifecycle Management

1. **Scene Initialization (`PlayScene.create`)**:
   - Initialize `this.album = new AlbumModel()`.
   - Initialize `this.tray = new DiscoveryTray(this, this.album)`.
   - Register event listeners connecting toys and modes to `this.album`.
2. **Action Handling (`PlayScene.handleAction`)**:
   - Priority 1: Parent Panel (if visible).
   - Priority 2: Mode Switcher buttons.
   - Priority 3: Discovery Tray hit (`this.tray.hit(e.x, e.y)`). If hit, triggers victory dance and returns `true` (consuming input).
   - Priority 4: Challenge Controller.
   - Priority 5: Mode Toys / Smash.
3. **Mode & Mood Changes**:
   - `setMode`: Tray adapts position (above piano keys in Piano, bottom edge in Smash/Drawing). Drawing's scratch card cleans up or initializes.
   - `applyMood`: Tray colors, background pill, and badge silhouettes update to match daytime vs bedtime palette.
4. **Resize Handling**:
   - Tray recalculates positions and safe areas.
   - Scratch card updates dimensions and repositions while preserving current coverage.
5. **New Player Reset (`R` in Grown-up Panel)**:
   - `this.album.reset()`.
   - `this.tray.refresh()`.
   - Scratch card resets to Card 0.

---

## 5. File-by-File Changes

### New Files to Create

1. `src/discovery/types.ts`:
   - Enums and interfaces for `BadgeId`, `BadgeDefinition`, `ScratchCardId`, `ScratchGrid`.
2. `src/discovery/scratchModel.ts`:
   - Pure grid coverage math and playlist management. Zero external dependencies.
3. `src/discovery/scratchModel.test.ts`:
   - Comprehensive Vitest unit tests for coverage math, boundary conditions, and card progression.
4. `src/discovery/albumModel.ts`:
   - Pure badge collection model and unlock rules.
5. `src/discovery/albumModel.test.ts`:
   - Vitest unit tests for album persistence, duplicate prevention, and reset semantics.
6. `src/discovery/illustrations.ts`:
   - Procedural texture generation for Dino, Shark, and Night Sky scratch illustrations.
7. `src/discovery/scratchCard.ts`:
   - Phaser presentation component for the erasable mask, auto-bloom celebration, and particle effects.
8. `src/discovery/tray.ts`:
   - Phaser presentation component for the bottom discovery dock and interactive victory dances.

### Existing Files to Modify

1. `src/config.ts`:
   - Add `CONFIG.discovery` block (thresholds, grid size, celebration durations, tray heights).
2. `src/modes/drawingMath.ts` & `src/modes/drawingMath.test.ts`:
   - Add/re-export pure coverage grid helpers to maintain cohesive drawing math utilities.
3. `src/modes/drawing.ts`:
   - Hook scratch card into `enter()`, delegate strokes in `extend()` / `dab()`, and clean up on mode exit.
4. `src/textures.ts`:
   - Register procedural badge textures (`badge-rim`, `badge-slot`, `badge-icon-rainbow`, etc.) and card illustrations.
5. `src/scenes/PlayScene.ts`:
   - Instantiate `AlbumModel` and `DiscoveryTray`.
   - Wire input routing, mode switches, resize, and panel `R` reset.
6. `src/toys/animals.ts`:
   - Trigger dinosaur/shark badge discoveries when visited.
7. `vitest.config.ts`:
   - Add `src/discovery/scratchModel.ts` and `src/discovery/albumModel.ts` to coverage include list.
8. `docs/requirements.md`:
   - Document requirements for Progressive Scratch-Off Unmasking (G7) and Visual Sticker Album (G8).

---

## 6. Testing Strategy

### 6.1 Pure Unit Tests (Vitest)
Per repository rules, pure logic lives outside Phaser and is verified via `npm test` and `npm run test:coverage`:
- **`scratchModel.test.ts`**:
  - Initializes grid with arbitrary width, height, rows, and cols.
  - Scratching at a single point marks only intersecting cells.
  - Points outside card bounds clamp safely without array index overflow.
  - Continuous segment scratching leaves no gaps.
  - Re-scratching already-cleared cells does not double-count coverage.
  - Threshold trigger: returns `isComplete() = true` at exactly 75%.
  - Monotonicity: coverage never decreases.
  - Reset sets coverage cleanly back to 0%.
  - Card progression: advances through Dino $\to$ Shark $\to$ Sky $\to$ Dino.
- **`albumModel.test.ts`**:
  - Starts with zero discovered badges.
  - `discover(id)` unlocks badge and returns `true`; subsequent calls return `false`.
  - `has(id)` accurately reflects unlock status.
  - `reset()` wipes all badges back to locked state.
- **Coverage Gate**:
  - Verify `npm run test:coverage` meets $\ge 90\%$ line and statement coverage, $\ge 85\%$ function and branch coverage.

### 6.2 Visual and Gameplay Verification (Playwright)
Run `npm run build && npm run shot`:
- **Drawing Mode Screenshot (`drawing.png` / `mobile-drawing.png`)**:
  - Confirms the scratch card is beautifully centered on the canvas.
  - Confirms strokes scratch away the cover to reveal the artwork underneath.
- **Tray Visibility (`latest.png`, `piano.png`, `bedtime.png`)**:
  - Confirms the discovery tray renders at the bottom in Smash and Drawing.
  - Confirms the discovery tray renders cleanly above the keys in Piano.
  - Confirms bedtime styling uses muted, soothing pastels and navy backgrounds.
- **Console Log Check**:
  - Playwright fails if any unhandled error or warning is logged during headless runs.

---

## 7. Step-by-Step Implementation Plan

### Step 1: Configuration & Pure Models (`src/config.ts`, `src/discovery/`)
1. Add `CONFIG.discovery` parameters to `src/config.ts`.
2. Implement `src/discovery/types.ts`.
3. Implement `src/discovery/scratchModel.ts` (pure grid coverage & card playlist).
4. Implement `src/discovery/scratchModel.test.ts` and verify with `npm test`.
5. Implement `src/discovery/albumModel.ts` (pure badge collection).
6. Implement `src/discovery/albumModel.test.ts` and verify with `npm test`.
7. Update `vitest.config.ts` coverage inclusion and verify `npm run test:coverage`.

### Step 2: Procedural Textures (`src/discovery/illustrations.ts`, `src/textures.ts`)
1. Create `src/discovery/illustrations.ts` with Canvas2D/Graphics generators for Dino Glade, Reef Shark, Starlit Sky, and the scratch-off cover.
2. Add badge stamp textures (`badge-rim`, `badge-slot`, `badge-icon-rainbow`) to `src/textures.ts`.
3. Hook texture builders into `buildTextures(scene)` in `src/textures.ts`.

### Step 3: Scratch-Off Unmasking Presentation (`src/discovery/scratchCard.ts`, `src/modes/drawing.ts`)
1. Build `ScratchCard` Phaser component managing the base artwork, `maskRT`, and auto-bloom tweening.
2. Integrate `ScratchCard` into `src/modes/drawing.ts` during `enter()`, `stroke()`, and `dab()`.
3. Wire the auto-bloom fanfare, sparkle particles, and badge unlock callback.

### Step 4: Discovery Tray Presentation (`src/discovery/tray.ts`, `src/scenes/PlayScene.ts`)
1. Build `DiscoveryTray` Phaser component with badge slot rendering, breathing idle tweens, and safe-area layout.
2. Implement the interactive victory dance (bounce to center, voice playback, particle confetti, return).
3. Integrate tray into `PlayScene`:
   - Layout adjustments for Smash, Drawing, and Piano modes.
   - Input delegation in `handleAction`.
   - New player (`R`) reset handling.

### Step 5: Mode & Toy Discovery Triggers
1. Hook dinosaur and shark encounters in `src/toys/animals.ts` to `album.discover()`.
2. Hook Piano 5-note pentatonic sequences to `album.discover('rainbow')`.
3. Hook challenge completions to `album.discover('starGarden')`.

### Step 6: Verification & Documentation
1. Run `npm run typecheck` to guarantee strict TypeScript compliance.
2. Run `npm test` and `npm run test:coverage` to confirm all coverage thresholds are satisfied.
3. Run `npm run build && npm run shot` to verify screenshot output across desktop, mobile, and bedtime modes with zero console errors.
4. Update `docs/requirements.md` with G7 and G8.
