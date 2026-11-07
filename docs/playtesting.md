# Observational Playtesting Protocol: Toddler & Preschooler Progression

This guide defines the observational playtesting methodology for validating hidden
puzzle discovery, tier difficulty, demonstration comprehension, and pacing with
children aged 2 and 4.

Automated browser suites (`scripts/progression-pass.mjs`) verify that hitboxes,
audio synths, input rates, and route recognition function reliably. However,
automated suites cannot measure curiosity, delight, cognitive load, or frustration.
This protocol provides structured rubrics, pacing benchmarks, and a standardized
logging template for physical play sessions with real children.

---

## 1. Core Principles of Toddler Observation

Children aged 2 and 4 interact with technology under completely different developmental
constraints:

1. **Non-Verbal & Non-Reading**: The player cannot read instructions, cannot be verbally
   coached through menus, and learns exclusively through audiovisual feedback and physical
   cause-and-effect.
2. **Zero In-Game Failure State**: There is no "Game Over", no penalty buzzer, and no error
   modal. When an input is incorrect, the engine quietly resets the current attempt
   (`attempt = 0`). The observer must never introduce artificial verbal failure cues
   (e.g., saying "Uh-oh!", "Oops!", or "Try again").
3. **Passive Observer Posture**: Observers must avoid directive prompting. The goal is to
   discover what the child notices and solves unaided.
4. **Intervention Escalation Scale**:
   - **Level 0 (Organic / Naturalistic)**: Complete silence. The child explores freely.
   - **Level 1 (Verbal Orienting)**: Non-directive verbal orientation without naming actions
     (e.g., "Look at that corner!", "Listen to that sound!").
   - **Level 2 (Gestural Orienting)**: Pointing a finger near the screen without touching.
   - **Level 3 (Co-Play Demonstration)**: Performing one action (e.g., tapping the firefly once)
     and immediately relinquishing control.

---

## 2. Firefly Discovery Observation Rubric (Requirement H1)

### 2.1 Mechanics Overview

In free play, a persistent, animated firefly perches on the 3×3 challenge grid:
- **Perch Sequence**: Top-Left (node 0) → Top-Right (node 2) → Bottom-Left (node 6).
- **Trail Dynamics**: When node 0 is selected, a subtle connecting trail line draws toward node 2.
  Selecting node 2 draws toward node 6. Selecting node 6 unlocks the game entrance.
- **Strict Trail Sensitivity**: Any tap, click, or keyboard press that does not hit the active
  firefly perch immediately breaks the trail and resets `entranceStep = 0`.
- **Permanent Entrance**: Once unlocked, a glowing portal frame remains anchored at node 0 for the
  duration of the session. A single tap re-enters the puzzle view.

### 2.2 Developmental Rubric: 2-Year-Olds vs. 4-Year-Olds

| Dimension | 2-Year-Old (Sensory-Motor / Exploratory) | 4-Year-Old (Goal-Directed / Pattern-Seeking) |
| :--- | :--- | :--- |
| **Visual Salience** | Easily distracted by flying letters, ripples, and bouncing shapes. Firefly's gentle sinusoidal alpha pulse may blend into background clutter. | Rapidly discriminates the persistent, glowing character from ephemeral toys. Directs visual gaze toward it. |
| **Motor Targeting** | High frequency, multi-finger slapping, or palm presses. Lower targeting precision; may miss the 35px aura hitbox. | Intentional single-finger index tap or coordinated mouse click on the bug body. |
| **Trail Sensitivity Friction** | **High Risk**: A 2-year-old who hits Perch 0 almost always taps somewhere else on the screen within 500 ms, inadvertently resetting `entranceStep` back to 0. | **Low Risk**: Able to inhibit immediate mashing, visually follow the hop to Perch 2, and trace the connecting line. |
| **Entrance Discovery** | Primarily serendipitous discovery or through Level 2/3 parental modeling. | Capable of Level 0 organic discovery within 1–3 minutes of initial exploration. |
| **Portal Retention** | Unlikely to remember that the framed firefly at Perch 0 is a gateway; treats it as another reactive toy. | Recognizes the doorway frame at Perch 0 as a distinct portal and intentionally re-enters after returning to free play. |

### 2.3 Firefly Scoring Scale

- **Score F0 (Ignored)**: Child plays for 3+ minutes without looking at or tapping the firefly.
- **Score F1 (Accidental Tap / Trail Broken)**: Child taps Perch 0, but immediately mashes elsewhere; trail resets before Perch 1 is noticed.
- **Score F2 (Attentive Hop)**: Child taps Perch 0, watches the hop to Perch 2, and attempts to follow, but misses or breaks the trail before Perch 6.
- **Score F3 (Guided Entrance)**: Child successfully enters after Level 1 or 2 parental orienting.
- **Score F4 (Autonomous Discovery)**: Child follows Perch 0 → 2 → 6 unassisted.
- **Score F5 (Retained Navigation)**: Child returns to free play and subsequently taps the portal to re-enter without prompting.

---

## 3. Tier Progression Pacing Benchmarks (Requirements H2–H3)

The design target is **20–40 seconds per tier** (approximately 10–20 seconds per authored round)
for a child who grasps the mechanic.

### 3.1 Pacing Categories

- **Rushed / Spurious (<15s / tier)**: Indicates uncontrolled mashing or accidental touches rather
  than cognitive comprehension. (Watch whether the child is looking at the screen).
- **Target Flow (20–40s / tier)**: Healthy balance: child attends to the demonstration, pauses to
  evaluate choices, and deliberately executes the correct answer.
- **Deliberative Exploration (40–60s / tier)**: Child hesitates or watches 1–2 replays, but
  maintains sustained, calm attention. Common and healthy for 2-year-olds on Tier 1.
- **Cognitive Overload / Motor Friction (>60s / tier)**: Child gets stuck in silent reset loops,
  repeatedly inputs incorrect choices, looks away, or expresses frustration.

### 3.2 Game-by-Game Pacing & Cognitive Milestones

```
+---------------------------------------------------------------------------------+
|                                 SMASH                                           |
| Tier 1: Silhouette Match      Tier 2: Alternating Pattern    Tier 3: Shape Memory|
| [Circle] / [Triangle]        [0,1,0,1 -> 0,1]               [0,2,1] / [2,1,0]   |
| Target: 15-25s               Target: 20-35s                 Target: 25-40s      |
+---------------------------------------------------------------------------------+
|                                 PIANO                                           |
| Tier 1: 2-Note Melody        Tier 2: 3-Note Melody          Tier 3: 4-Note Melody|
| [0, 1] / [1, 2]              [0, 2, 1] / [2, 0, 1]          [0,1,2,1] / [2,1,0,1]|
| Target: 15-25s               Target: 20-35s                 Target: 30-45s      |
+---------------------------------------------------------------------------------+
|                                DRAWING                                          |
| Tier 1: Straight Paths       Tier 2: Bent Routes            Tier 3: Closed Loops|
| Horizontal / Vertical        L-Corner / Step                9-Node Perimeter    |
| Target: 15-25s               Target: 25-40s                 Target: 30-45s      |
+---------------------------------------------------------------------------------+
```

#### Smash (Shape Recognition & Working Memory)
- **Tier 1 (Silhouette Match — Rounds 1 & 2)**:
  - *2-Year-Old*: Grasps direct 1:1 visual matching quickly if choices are distinct. Target: 20–30s.
  - *4-Year-Old*: Immediate recognition. Target: 10–15s.
- **Tier 2 (Alternating Pattern ABAB — Rounds 3 & 4)**:
  - *2-Year-Old*: Often selects the last visible item rather than continuing the alternating rule.
    Expect multiple silent resets. Target: 35–50s (or requires Level 1 prompting).
  - *4-Year-Old*: Intuitive understanding of rhythm/pattern. Target: 20–30s.
- **Tier 3 (Shape Memory — Rounds 5 & 6)**:
  - *2-Year-Old*: Exceeds typical working memory span (3 items in serial order).
  - *4-Year-Old*: Achievable if the child attends to the sequential demonstration. Target: 25–40s.

#### Piano (Auditory-Spatial Copy-Cat)
- **Tier 1 (2-Note Melody — Rounds 1 & 2)**:
  - *2-Year-Old*: Reads the visual key glow rather than pitch. Easily completes adjacent 2-note pairs. Target: 15–25s.
  - *4-Year-Old*: Connects pitch contour to spatial position. Target: 10–20s.
- **Tier 2 (3-Note Melody — Rounds 3 & 4)**:
  - Non-adjacent jumps (e.g., Left → Right → Middle).
  - Benchmark: 20–35s. Watch whether the child tracks the glowing note symbol at the key center.
- **Tier 3 (4-Note Melody — Rounds 5 & 6)**:
  - Repeating sequences (e.g., [0, 1, 2, 1]).
  - Benchmark: 30–45s. Requires sustained auditory-visual attention.

#### Drawing (Fine-Motor Tracing & Path Closure)
- **Tier 1 (Straight 3-Node Paths — Rounds 1 & 2)**:
  - *2-Year-Old*: Can swipe across screen, but may stray outside the `radius * 1.8` corridor. Target: 20–35s.
  - *4-Year-Old*: Smooth continuous line. Target: 15–20s.
- **Tier 2 (Bent 4-Node Routes — Rounds 3 & 4)**:
  - Requires turning a 90° corner without cutting diagonally across the grid.
  - Benchmark: 25–40s. Look for corner overshooting or premature diagonal shortcuts.
- **Tier 3 (Closed 9-Node Perimeter Loops — Rounds 5 & 6)**:
  - Requires continuous single-finger tracing through all perimeter nodes back to the start.
  - *2-Year-Old*: Extremely difficult due to fine motor endurance and multi-touch tendencies.
  - *4-Year-Old*: Highly engaging puzzle; feels like drawing a box. Target: 30–45s.

---

## 4. Demonstration & Non-Reader Controls Comprehension

### 4.1 Audiovisual Demonstrations

The engine automatically plays demonstrations upon entering a round or tapping replay:
- **Pacing**: 650 ms per step (Daytime) or 1300 ms (Bedtime).
- **Interruptibility**: Any player input immediately cancels the demo and enters play mode.

**Observation Checklist**:
1. *Do children wait for the demo to finish?*
   - Toddlers (age 2) almost always interrupt the demo by touching the screen immediately.
   - Older preschoolers (age 4) frequently pause, watch the demonstration, and only start once the sequence ends.
2. *Does Bedtime tempo (1300 ms/step) lose attention?*
   - Verify whether the slower demonstration pace in Bedtime leads to premature tapping due to impatience.

### 4.2 Non-Reader Pictorial Controls

```
+---------------------------------------------------------------------------------+
|  [ < ] (Back)                   (Flower 1)(Flower 2)(Flower 3)        [ @ ] (Replay)|
|  Left Circle                              Center Tier Gauge            Curved Arrow |
+---------------------------------------------------------------------------------+
```

#### Curved-Arrow Replay Button (Top-Right)
- **Affordance**: Circular curved arrow with paper-white backing and ink border.
- **Observation Focus**:
  - Do children recognize that tapping this button restarts the audio-visual demonstration?
  - Does the child reach for replay when stuck on a Tier 3 memory or melody puzzle?
  - Is it tapped intentionally or accidentally due to proximity to the edge?

#### Left-Arrow Back Button (Top-Left)
- **Affordance**: Directional left arrow.
- **Observation Focus**:
  - Does the child associate this with "leaving" or "going home"?
  - If pressed accidentally, does the child show distress? (Note: returning preserves earned rounds;
    re-entering via the portal resumes the current tier immediately).

#### Center Three-Flower Tier Indicator
- **Affordance**: Three circular floral star glyphs that light up as tiers are completed:
  - Tier 1 complete (Round 2): Flower 1 blooms.
  - Tier 2 complete (Round 4): Flower 2 blooms.
  - Tier 3 complete (Round 6): Flower 3 blooms, triggering playground unlock.
- **Observation Focus**:
  - Do children notice the blooming flowers?
  - Does the visual progress indicator provide positive reinforcement without numerical scores?

#### Multi-Touch Rejection (Drawing Specific)
- **Affordance Constraint**: In Drawing puzzles, touching with more than one finger simultaneously
  triggers `multiTouch = true` and silently resets the attempt.
- **Observation Focus**:
  - Toddlers frequently rest their non-dominant hand or palm on the tablet bezel/screen.
  - Does multi-touch rejection silently block valid drawing attempts? Watch for palm resting!

---

## 5. Creative Playground Rewards Evaluation (Requirement H6)

Completing Round 6 unlocks a sandbox playground for that game:

1. **Smash Star Garden**:
   - Each tap plants a star; up to 24 stars connect with constellation lines, recycling the oldest.
   - *Validation*: Does the child notice the connecting lines? Do they smile or vocalize when the
     oldest star disappears and a new line stretches across the screen?
2. **Piano Echo Queue**:
   - Played notes trigger a quiet delayed echo 600 ms later (pentatonic, uncapped recurrence prevented).
   - *Validation*: Does the child pause to listen to the echo ("call and response"), or do they mash
     continuously over the echo?
3. **Drawing Rainbow Symmetry**:
   - Strokes and sticker stamps mirror across the canvas vertical center line.
   - *Validation*: Does the child notice the bilateral symmetry? Do they attempt to draw "faces",
     "butterflies", or wide horizontal arcs to see both crayons move?

---

## 6. Qualitative Playtesting Session Template

Copy and paste this template when logging live play sessions with children.

```markdown
# Playtesting Session Log

### Session Metadata
- **Date / Time**: YYYY-MM-DD HH:MM
- **Child Identifier / Age**: [e.g., Child A (2y 4m) / Child B (4y 1m)]
- **Device & Form Factor**: [e.g., iPad 10.9" touch / MacBook Air 13" trackpad / Desktop keyboard]
- **Environment & Setup**: [e.g., Living room couch, lap play, desk with external mouse]
- **Initial Mood**: [ Daytime | Bedtime ]
- **Corner Switcher Buttons**: [ Visible | Hidden ]

---

### Phase 1: Free Play & Discovery Observation
- **Initial Engagement (First 60s)**:
  - Preferred sub-game: [ Smash | Piano | Drawing ]
  - Tap/Mash frequency: [ Calmer deliberate taps | High-speed forearm mashing | Fluid dragging ]
- **Firefly Noticing**:
  - Time elapsed before first glance at firefly: [ mm:ss | Never noticed ]
  - Child verbalization or gesture: [ e.g., Pointed and said "Bug!", tapped blindly ]
- **Trail Following**:
  - Attempt 1: Reached Perch [ 0 | 1 | 2 ] -> Reset cause: [ Off-target tap | Palm rest | Ignored ]
  - Attempt 2: Reached Perch [ 0 | 1 | 2 ] -> Reset cause: [ ... ]
  - Autonomous entrance achieved: [ Yes | No (Required Level X intervention) ]
  - Intervention Level required: [ Level 0 (None) | Level 1 (Verbal) | Level 2 (Gesture) | Level 3 (Co-play) ]
- **Firefly Score**: [ F0 | F1 | F2 | F3 | F4 | F5 ]

---

### Phase 2: Puzzle Progression & Pacing Log

#### Game 1: [ Smash | Piano | Drawing ]
| Tier / Round | Time to Solve | Attempts / Resets | Watched Demo? | Replay Tapped? | Behavioral Reactions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (R1)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ Smiles, vocalizations, confusion ] |
| **Tier 1 (R2)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ ... ] |
| **Tier 2 (R3)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ ... ] |
| **Tier 2 (R4)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ ... ] |
| **Tier 3 (R5)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ ... ] |
| **Tier 3 (R6)** | 00:00 | 0 | [ Full / Interrupted ] | [ Yes / No ] | [ ... ] |

- **Tier 1 Total Pacing**: [ mm:ss ] — [ Rushed (<15s) | Target (20-40s) | Deliberative (40-60s) | Friction (>60s) ]
- **Tier 2 Total Pacing**: [ mm:ss ] — [ Rushed (<15s) | Target (20-40s) | Deliberative (40-60s) | Friction (>60s) ]
- **Tier 3 Total Pacing**: [ mm:ss ] — [ Rushed (<15s) | Target (20-40s) | Deliberative (40-60s) | Friction (>60s) ]

---

### Phase 3: Pictorial Controls & Usability
- **Curved-Arrow Replay Button**:
  - Tapped intentionally when stuck: [ Often | Rarely | Never | Accidental only ]
- **Left-Arrow Back Button**:
  - Tapped to exit: [ Intentionally to return to free play | Accidental tap caused surprise | Never tapped ]
  - Recovery after exit: [ Immediately re-entered via portal | Stayed in free play | Switched games ]
- **Flower Progress Gauge**:
  - Did the child notice the flowers lighting up?: [ Pointed at flowers | Cheered | Unnoticed ]
- **Motor / Input Friction**:
  - Drawing palm/multi-touch resets observed: [ None | 1-2 times | Frequent disruption ]
  - Hitbox misses on choice icons / keys: [ None | Occasional edge tap | Frequent miss ]

---

### Phase 4: Creative Playground Engagement
- **Unlocked Playground**: [ Smash Star Garden | Piano Echoes | Drawing Symmetry ]
- **Time Spent in Playground**: [ mm:ss ]
- **Engagement Quality**:
  - [ Immediate delight / vocal reaction ]
  - [ Calm sustained experimentation ]
  - [ Disregard / quickly left via back button ]
  - Notes on child's behavior: [ e.g., Drew large circles to see mirror butterfly effect ]

---

### Phase 5: Synthesis & Actionable Recommendations
- **What Worked Seamlessly**:
  - [ Observation 1 ]
  - [ Observation 2 ]
- **Friction Points Identified**:
  - [ e.g., Firefly trail reset too punishing for 2yo exploratory mashing ]
  - [ e.g., Piano Tier 3 (4 notes) tempo in Bedtime too slow, child loses attention ]
- **Recommended Tuning / Code Changes**:
  - Parameter to adjust: [ e.g., CONFIG.challenges.demoStepMs / corridor radius / hit radius ]
```

---

## 7. Engine Tuning & Calibration Guidance

When observational data highlights friction, use this reference table to map symptoms to
specific parameters:

| Observed Symptom | Likely Cause | Tuning File & Parameter |
| :--- | :--- | :--- |
| **2yo breaks firefly trail constantly** | Off-target taps immediately reset `entranceStep` to 0. | `src/challenges/model.ts`: Relax `follow(game, hit)` to tolerate 1–2 background taps before wiping trail. |
| **Child interrupts demo before seeing answer** | Demo tempo too slow or visual cue too subtle. | `src/config.ts`: `challenges.demoStepMs` (currently 650 ms). |
| **Drawing corners fail frequently** | Child cuts corner or corridor is too narrow for small fingers. | `src/challenges/controller.ts`: Increase corridor threshold multiplier (`radius * 1.8`). |
| **Tablet drawing resets constantly** | Child rests non-drawing palm on screen edge, triggering multi-touch. | `src/challenges/controller.ts`: Reject small edge touches or require secondary touch movement before resetting. |
| **Child ignores Piano echoes** | 600 ms delay either too fast (blends in) or too slow (child already mashing next key). | `src/config.ts`: `challenges.echoDelayMs` (currently 600 ms). |
| **Hitboxes missed by clumsy toddler fingers** | Hit test radius too small for small screens. | `src/challenges/layout.ts`: `radius` scale floor in `challengeLayout`. |
