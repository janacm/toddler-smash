# Implementation Plan: Motor Schema Toys (Technique 5)

## 1. Executive Summary & Developmental Rationale

### 1.1 Developmental Context: Motor Play Schemas in Toddlerhood
In early childhood cognitive and motor development (grounded in the research of Jean Piaget, Chris Athey, and Cathy Nutbrown), children between 18 months and 4 years explore and construct their mental models of the physical world through repetitive patterns of action known as **play schemas**.

Before children can understand formal game rules, symbols, or verbal instructions, they instinctively investigate physical dynamics through motor schemas:
1. **Trajectory Schema**: Exploring movement along lines—flinging, launching, tracking objects, observing ballistic arcs, boundary rebounds, and elastic collisions.
2. **Rotation Schema**: Exploring things that turn—spinning wheels, circular vortices, centrifugal scattering, and the kinetic relationship between angular velocity and outward dispersion.
3. **Connecting Schema**: Joining things together—tying, linking separate points, bridging gaps, and perceiving disconnected objects as a cohesive constellation or network.

### 1.2 Objective
Implement three dedicated, rich procedural toys in `toddler-smash` aligned with these schemas:
- **Trajectory Toy** (`src/toys/trajectory.ts`): Cosmic glowing orbs flung along ballistic/straight trajectories that collide with screen boundaries, dynamically squash and stretch upon impact, trigger a percussive woody/rubbery pop, and rebound into play.
- **Rotation Toy** (`src/toys/rotation.ts`): Celestial pinwheels and vortices that spin up with angular acceleration, ejecting sparkling dust along tangent and centrifugal vectors based on rotational kinematics.
- **Connection Toy** (`src/toys/connection.ts`): Constellation snapping where celestial stars link with dynamic elastic luminous threads (`elasticSegment`) that twang into tension when placed near recent anchors.

### 1.3 Key Architectural Invariants
All additions strictly respect repository conventions (`AGENTS.md`):
- **Zero failure states**: Smashes always produce delight; no error dialogues or modal traps.
- **Strict sprite pooling**: All visual elements are spawned via `ctx.pool.spawn(texture, x, y)` and retired with `ctx.pool.retire(img, delayMs, fadeMs)`. Never `scene.add.image`; never `img.destroy()`. Elastic connector threads are pooled pill sprites (`'elasticSegment'`), avoiding unpooled graphics allocations.
- **Procedural visuals only**: No image assets. Textures (`'orbGlow'`, `'pinwheel'`, `'elasticSegment'`) are procedurally generated in `src/textures.ts` using Canvas/Graphics.
- **Consonant audio only**: WebAudio synthesis via `src/audio.ts` on the pentatonic scale (`CONFIG.audio.scaleSemitones`). Audio voices capped by `CONFIG.limits.maxVoices`. The new woody/rubbery `'pop'` voice synthesizes harmonic percussive feedback for wall impacts without clipping or dissonance.
- **Pure logic separation & 100% test coverage**: Geometry, trajectory intersections, squash-and-stretch scales, centrifugal dust vectors, and constellation link topology are isolated in `src/toys/schemaMath.ts` (free of Phaser DOM dependencies) and thoroughly verified in `src/toys/schemaMath.test.ts`.

---

## 2. Architecture & Data Flow

```
                     [Player Action: Tap, Click, or Smash]
                                      │
                                      ▼
                             [input.ts / PlayScene]
                                      │
                                      ▼
                             [playSmash in toys/index.ts]
                                      │
                         Weighted Selection (toys/play.ts)
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
 [trajectory.ts]                [rotation.ts]                 [connection.ts]
 (Trajectory Schema)           (Rotation Schema)            (Connecting Schema)
       │                              │                              │
       ├──────────────────────────────┴──────────────────────────────┤
       │ Calls Pure Math                                             │
       ▼                                                             ▼
 [schemaMath.ts]                                            [textures.ts]
 - calculateBounceRay()                                     - 'orbGlow'
 - calculateSquashStretch()                                 - 'pinwheel'
 - calculateRotationalDust()                                - 'elasticSegment'
 - findConstellationLinks()                                          │
 - segmentTransform()                                                │
       │                                                             │
       └──────────────────────────────┬──────────────────────────────┘
                                      │ Spawns & Retires
                                      ▼
                              [pool.ts: SpritePool]
                                      │
                                      ▼
                              [audio.ts: Synth]
                              - 'pop' voice (Woody/Rubbery)
                              - 'blip' voice (Arpeggios)
```

---

## 3. Mathematical Specification (`src/toys/schemaMath.ts`)

Extract all geometric and physical calculations into a standalone module `src/toys/schemaMath.ts` with no Phaser or browser imports.

### 3.1 Data Types
```ts
export interface Point2D {
  x: number
  y: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface Box2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface BounceRayResult {
  hitPoint: Point2D
  normal: Vector2D
  flightDistance: number
  flightDurationMs: number
  reflectedVelocity: Vector2D
}

export interface SquashStretchResult {
  scaleX: number
  scaleY: number
}

export interface RotationalDustParticle {
  tip: Point2D
  velocity: Vector2D
  target: Point2D
}

export interface SegmentTransform {
  midpoint: Point2D
  length: number
  angleRad: number
  angleDeg: number
  scaleX: number
}

export interface ConstellationAnchor {
  x: number
  y: number
  time: number
  colorIndex: number
}

export interface ConstellationLink {
  anchor: ConstellationAnchor
  distance: number
}
```

### 3.2 Functions

#### 1. `calculateBounceRay(origin: Point2D, velocity: Vector2D, bounds: Box2D, radius = 0, restitution = 0.75): BounceRayResult`
- Clamps `origin` within the interior of `[bounds.minX + radius, bounds.minY + radius, bounds.maxX - radius, bounds.maxY - radius]`.
- Solves parametric ray-box intersection `P(t) = origin + velocity * t` for smallest `t > 0` against the 4 inner edges:
  - Left edge ($x = \text{minX} + r$): normal $(1, 0)$
  - Right edge ($x = \text{maxX} - r$): normal $(-1, 0)$
  - Top edge ($y = \text{minY} + r$): normal $(0, 1)$
  - Bottom edge ($y = \text{maxY} - r$): normal $(0, -1)$
- Computes hit point $H = \text{origin} + v \cdot t$.
- Calculates reflected velocity with restitution damping:
  $$v_{\text{refl}} = (v - 2(v \cdot n)n) \times \text{restitution}$$
- Computes distance $d = |H - \text{origin}|$ and flight duration $t_{\text{ms}} = (d / |v|) \times 1000$.

#### 2. `calculateSquashStretch(baseScale: number, normal: Vector2D, squashFactor = 0.5): SquashStretchResult`
- Conserves perceived area in 2D by stretching along the tangent while squashing along the normal:
  $$\text{stretchFactor} = \frac{1}{\sqrt{\text{squashFactor}}}$$
- If impact is predominantly horizontal ($|n_x| > |n_y|$):
  $$\text{scaleX} = \text{baseScale} \times \text{squashFactor}, \quad \text{scaleY} = \text{baseScale} \times \text{stretchFactor}$$
- If impact is predominantly vertical ($|n_y| \ge |n_x|$):
  $$\text{scaleY} = \text{baseScale} \times \text{squashFactor}, \quad \text{scaleX} = \text{baseScale} \times \text{stretchFactor}$$

#### 3. `calculateRotationalDust(center: Point2D, radius: number, currentAngleRad: number, bladeCount: number, angularVelocityRadS: number, centrifugalBoost = 120, flightDurationS = 0.6): RotationalDustParticle[]`
- For each blade $i \in \{0, \dots, \text{bladeCount} - 1\}$:
  - $\theta_i = \text{currentAngleRad} + \frac{2\pi i}{\text{bladeCount}}$
  - Tip position:
    $$\text{tip}_x = \text{center}_x + r \cos(\theta_i), \quad \text{tip}_y = \text{center}_y + r \sin(\theta_i)$$
  - Tangential direction unit vector:
    $$t = (-\sin(\theta_i), \cos(\theta_i))$$
  - Radial direction unit vector:
    $$u = (\cos(\theta_i), \sin(\theta_i))$$
  - Velocity vector combining tangential speed ($v_{\text{tan}} = \omega \cdot r$) and centrifugal outward surge:
    $$v = t \times (\omega \cdot r) + u \times \text{centrifugalBoost}$$
  - Projected target position:
    $$\text{target} = \text{tip} + v \times \text{flightDurationS}$$

#### 4. `segmentTransform(p1: Point2D, p2: Point2D, baseSegmentWidth = 64): SegmentTransform`
- Computes midpoint:
  $$\text{mid} = \left(\frac{p1.x + p2.x}{2}, \frac{p1.y + p2.y}{2}\right)$$
- Computes length $L = \sqrt{(p2.x - p1.x)^2 + (p2.y - p1.y)^2}$.
- Computes orientation:
  $$\theta = \text{atan2}(p2.y - p1.y, p2.x - p1.x)$$
  $$\text{angleDeg} = \frac{\theta \times 180}{\pi}$$
- Computes horizontal scale for a pooled sprite whose nominal texture width is `baseSegmentWidth`:
  $$\text{scaleX} = \frac{L}{\text{baseSegmentWidth}}$$

#### 5. `findConstellationLinks(newPoint: Point2D, candidates: ConstellationAnchor[], options: { minDist: number; maxDist: number; maxLinks: number; now: number; maxAgeMs: number }): ConstellationLink[]`
- Filters out expired anchors where $(\text{now} - \text{candidate.time}) > \text{maxAgeMs}$.
- Calculates Euclidean distance to `newPoint`.
- Filters candidates satisfying $\text{minDist} \le d \le \text{maxDist}$.
- Sorts ascending by distance.
- Returns up to `maxLinks` nearest eligible anchors.

---

## 4. Procedural Textures (`src/textures.ts`)

Procedural textures baked into Phaser's texture cache at startup:

### 4.1 `'orbGlow'` (128×128)
- Radial luminous cosmic orb drawn in white (`0xffffff`) with alpha layers:
  1. Soft outer corona: radius 60, alpha 0.12
  2. Intermediate aura: radius 44, alpha 0.28
  3. Bright inner ring: radius 28, alpha 0.65
  4. Intense core: radius 14, alpha 1.0
- Can be tinted with any palette color to produce soft glowing energy spheres.

### 4.2 `'pinwheel'` (128×128)
- Luminous 4-blade galaxy / celestial pinwheel:
  - 4 curved teardrop spiral vanes radiating outward to radius 52.
  - Central luminous hub: circle of radius 12 at $(64, 64)$.
  - Accents on blade tips: soft dots of radius 4.
- White base for full dynamic tinting.

### 4.3 `'elasticSegment'` (64×16)
- Pill/capsule connector segment:
  - Outer rounded glow: `fillRoundedRect(0, 0, 64, 16, 8)` with alpha 0.4.
  - Inner bright elastic core: `fillRoundedRect(4, 4, 56, 8, 4)` with alpha 0.95.
- Origin centered at $(0.5, 0.5)$. When placed at segment midpoint and scaled by $\text{scaleX} = \text{dist} / 64$, it seamlessly links the two star coordinates with zero allocation.

---

## 5. Audio Synthesis: Woody/Rubbery Pop Voice (`src/audio.ts`)

### 5.1 Voice Type Extension
```ts
export type Voice = 'blip' | 'piano' | 'dinosaur' | 'bubble' | 'pop'
```

### 5.2 Pop Sound Design
- **Timbre**: Triangle wave oscillator (rich in odd harmonics, naturally warm and woody).
- **Pitch Envelope**: Dynamic micro-pitch drop. The frequency starts at $1.8 \times \text{freq}$ and exponentially glides down to $\text{freq}$ in 22ms. This creates the classic acoustic signature of a rubber ball bounce or a resonant wooden block strike.
- **Gain Envelope**:
  - Punchy attack: 3ms linear ramp to peak level ($0.85 \times \text{level}$).
  - Rapid damped exponential decay: drops to 0.0001 over $\sim 80\text{ms} \times (\text{mood.noteMs} / 620)$.
- **Concurrency & Resource Management**:
  - Increments `this.voices`, checks against `CONFIG.limits.maxVoices`.
  - Cleans up and decrements voices in `osc.onended`.
  - Protected with `try/catch` to guarantee audio never throws.

---

## 6. Toy Implementations

### 6.1 Trajectory Toy (`src/toys/trajectory.ts`)
- **Metadata**: `name: 'trajectory'`, `weight: 3`.
- **Trigger**: Non-character smashes/taps.
- **Flight & Rebound Pipeline**:
  1. Determines initial launch trajectory:
     - Speed: 400–650 px/s (scaled by `currentMood().timeScale`).
     - Angle: Random radial vector or upward/diagonal bias.
  2. Calls `calculateBounceRay` from `schemaMath.ts` against screen dimensions minus 28px margin.
  3. Spawns orb sprite: `const orb = ctx.pool.spawn('orbGlow', e.x, e.y)`.
     - Tints with `ctx.color(e.index)`.
     - Scales to $0.75 - 1.15$.
  4. Adds flight tween from $(e.x, e.y)$ to boundary `hitPoint` over `flightDurationMs` with `'Linear'` or `'Sine.easeOut'`.
  5. On boundary impact:
     - Triggers woody/rubbery bounce pop: `ctx.synth.play(e.index + 2, 'pop', 0.85)`.
     - Computes dynamic deformation via `calculateSquashStretch(baseScale, normal, 0.45)`.
     - Adds rapid squash tween (60ms) and recovery rebound tween (90ms).
     - Spawns 3–4 tiny boundary spark dots (`'dot'`) radiating inward from the collision.
     - Secondary rebound flight: Tweens along `reflectedVelocity` for 350–500ms.
     - Retires orb via `ctx.pool.retire(orb, totalMs, 300)`.

### 6.2 Rotation Toy (`src/toys/rotation.ts`)
- **Metadata**: `name: 'rotation'`, `weight: 3`.
- **Trigger**: Non-character smashes/taps.
- **Vortex & Dust Pipeline**:
  1. Spawns pinwheel sprite: `const wheel = ctx.pool.spawn('pinwheel', e.x, e.y)`.
     - Tints with `ctx.color(e.index)`.
     - Initial scale 0.15, expanding to $0.85 - 1.2$.
  2. Adds rotational tween:
     - Accelerates rotation: $\pm(720^\circ - 1080^\circ)$ over 1200–1500ms using `'Cubic.easeOut'`.
  3. Centrifugal dust ejection:
     - At milestone spin velocities (e.g. 150ms and 350ms delay), computes particle flight vectors using `calculateRotationalDust(...)`.
     - Spawns 4 to 8 sparkling dust particles (`'dot'`) positioned at the rotating blade tips.
     - Each particle is tweened along its combined tangential + centrifugal trajectory to its target position over 400–700ms with fade out.
     - Retires dust particles with `ctx.pool.retire(dot, lifetimeMs, 200)`.
  4. Plays musical feedback: Ascending pentatonic chord/arpeggio (`play(e.index, 'blip')`, `play(e.index + 2, 'blip')`).
  5. Retires pinwheel sprite: `ctx.pool.retire(wheel, 1100, 400)`.

### 6.3 Connection Toy (`src/toys/connection.ts`)
- **Metadata**: `name: 'connection'`, `weight: 3`.
- **Trigger**: Non-character smashes/taps.
- **Constellation Snapping Pipeline**:
  1. Maintains a bounded module-level ring buffer of recent anchor stars (last 8 anchors within 3200ms).
  2. Spawns constellation star node at $(e.x, e.y)$:
     - `const star = ctx.pool.spawn('star', e.x, e.y)` (or `'orbGlow'`).
     - Scale pop-in: 0.1 to 0.75 with `'Back.easeOut'`.
     - Tints with `ctx.color(e.index)`.
  3. Queries `findConstellationLinks(...)` in `schemaMath.ts` to locate up to 2 nearby eligible anchors (distance between 35px and 340px).
  4. If links are found:
     - For each link, computes segment positioning using `segmentTransform(anchor, e, 64)`.
     - Spawns thread sprite: `const thread = ctx.pool.spawn('elasticSegment', midpoint.x, midpoint.y)`.
     - Sets angle to `angleDeg`, initial `scaleX = length / 64`.
     - Elastic snapping tween:
       - Starts with thin `scaleY = 0.2`, snaps to `scaleY = 1.3` then settles to `0.8` using `'Elastic.easeOut'` or `'Back.easeOut'`, simulating a twanging cosmic rubber band.
       - Tints thread with harmonic palette color.
       - Retires thread via `ctx.pool.retire(thread, 1400, 400)`.
     - Audio: Plays a harmonious interval (root + fifth: `play(e.index)` and `play(e.index + 4)`).
  5. If no links found (first star of a cluster):
     - Spawns an inviting beacon ripple (`'ring'`) expanding outward to prompt the child to tap nearby.
     - Retires star via `ctx.pool.retire(star, 1800, 500)`.
  6. Adds $(e.x, e.y)$ to the anchor ring buffer.

---

## 7. Registry & Configuration Updates

### 7.1 Toy Registry (`src/toys/index.ts`)
Export and register all three toys in `TOYS`:
```ts
import { trajectory } from './trajectory'
import { rotation } from './rotation'
import { connection } from './connection'

export const TOYS: Toy[] = [
  animalKeys,
  letterPop,
  shapeBurst,
  ripple,
  critter,
  dinosaur,
  shark,
  trajectory,
  rotation,
  connection,
]
```

### 7.2 Configuration (`src/config.ts`)
Add a dedicated section for schema toys under `CONFIG`:
```ts
  /** Motor schema toys: trajectory, rotation, and constellation connections. */
  schemas: {
    trajectorySpeedMin: 420,
    trajectorySpeedMax: 650,
    trajectoryRestitution: 0.72,
    rotationSpeedRad: 18,
    centrifugalBoost: 140,
    constellationMaxDist: 340,
    constellationMinDist: 35,
    constellationMaxLinks: 2,
    constellationAnchorAgeMs: 3200,
  },
```

### 7.3 Vitest Coverage Configuration (`vitest.config.ts`)
Add `'src/toys/schemaMath.ts'` to `coverage.include`.

---

## 8. Step-by-Step Implementation Checklist

1. [ ] **Step 1: Pure Logic Module & Unit Tests**
   - Create `src/toys/schemaMath.ts` implementing:
     - `calculateBounceRay`
     - `calculateSquashStretch`
     - `calculateRotationalDust`
     - `segmentTransform`
     - `findConstellationLinks`
   - Create `src/toys/schemaMath.test.ts` covering 100% of statements, branches, and edge cases (boundary corners, zero velocities, collinear points, anchor expiry).
   - Update `vitest.config.ts` to include `src/toys/schemaMath.ts`.
   - Run `npm test` and `npm run test:coverage` to confirm green gate.

2. [ ] **Step 2: Audio Synthesis Extension**
   - Update `src/audio.ts`:
     - Add `'pop'` to `Voice` type.
     - Implement `playPop` with woody/rubbery micro-pitch drop and triangle wave resonance.
   - Update `src/audio.test.ts` to test `'pop'` voice parameters, voice counting, and error handling.
   - Run `npm test`.

3. [ ] **Step 3: Procedural Textures**
   - Update `src/textures.ts` inside `buildTextures`:
     - Add `'orbGlow'` (layered radial glow).
     - Add `'pinwheel'` (4-blade curved spiral with center hub).
     - Add `'elasticSegment'` (pill/capsule connector segment).

4. [ ] **Step 4: Toy Implementations**
   - Create `src/toys/trajectory.ts`.
   - Create `src/toys/rotation.ts`.
   - Create `src/toys/connection.ts`.
   - Update `src/config.ts` with schema configuration numbers.
   - Register the three toys in `src/toys/index.ts`.

5. [ ] **Step 5: SpritePool Origin Defense**
   - In `src/pool.ts` `spawn`: Ensure `img.setOrigin(0.5, 0.5)` is explicitly reset alongside scale, alpha, angle, and tint to protect against any orientation drift during recycling.

6. [ ] **Step 6: Type Checking & Integration Testing**
   - Run `npm run typecheck`.
   - Run `npm test` and `npm run test:coverage`.
   - Verify all coverage thresholds (lines $\ge 90\%$, functions $\ge 85\%$, branches $\ge 85\%$) pass.

7. [ ] **Step 7: Visual Verification**
   - Run `npm run shot` to verify that all screenshots render cleanly and no console errors are thrown.
   - Review generated screenshots in `shots/` and verify mash passes.

8. [ ] **Step 8: Documentation Updates**
   - Update `docs/requirements.md` (e.g. entry C1 / G1 notes).
   - Update `docs/grown-ups.md` with description of new motor schema toys in Smash mode.

---

## 9. Testing & Verification Plan

### 9.1 Vitest Unit Tests (`src/toys/schemaMath.test.ts`)
- **Ray-Box Intersection**:
  - Direct horizontal, vertical, and diagonal ray collisions against 4 screen edges.
  - Verification of hit normal vectors `(1,0)`, `(-1,0)`, `(0,1)`, `(0,-1)`.
  - Reflected velocity vector verification with restitution damping.
  - Clamping when initial point is on or outside boundary margin.
- **Squash and Stretch**:
  - Horizontal impact yields $X$ squash and $Y$ stretch.
  - Vertical impact yields $Y$ squash and $X$ stretch.
  - Base scale scaling factor accuracy.
- **Rotational Dust**:
  - Circular blade tip placement at varying rotation angles.
  - Velocity vector decomposition into tangential and centrifugal components.
  - Deterministic target projection.
- **Constellation Linkage**:
  - Distance computation.
  - Segment midpoint, length, angle degrees, and horizontal scale calculation.
  - Filtering of anchors by distance window and timestamp freshness.
  - Sorting and capping to `maxLinks`.

### 9.2 Synth Unit Tests (`src/audio.test.ts`)
- Verify `'pop'` voice uses pentatonic scale frequencies with octave shift.
- Verify triangle wave and frequency pitch glide from $1.8 \times \text{freq}$ to $\text{freq}$.
- Verify voice cap counting and release on `osc.onended`.

### 9.3 End-to-End Headless Verification
- `npm run typecheck`: Strict TypeScript checking.
- `npm run test:coverage`: Must meet per-file coverage thresholds.
- `npm run shot`: Validates Playwright browser execution, confirms zero runtime exceptions, verifies textures bake properly, and confirms headless gameplay remains glitch-free.
