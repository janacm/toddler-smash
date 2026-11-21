import type { ShapeKey } from '../textures'

export const DANCE_MOVES = [
  'jump',
  'disco',
  'spin',
  'wave',
  'clap',
  'robot',
  'kick',
  'boogie',
] as const

export type DanceMove = (typeof DANCE_MOVES)[number]

export type DancerExpression = 'smile' | 'joy' | 'sing'

export interface LimbJoints {
  midX: number
  midY: number
  endX: number
  endY: number
}

export interface DancerPose {
  offsetX: number
  offsetY: number
  torsoTilt: number
  headTilt: number
  squashX: number
  squashY: number
  /** 0..1 progress through a full horizontal turn (`0` and `1` face front). */
  spinPhase: number
  leftShoulderAngle: number
  leftElbowAngle: number
  rightShoulderAngle: number
  rightElbowAngle: number
  leftHipAngle: number
  leftKneeAngle: number
  rightHipAngle: number
  rightKneeAngle: number
  expression: DancerExpression
}

const KEY_TO_MOVE: Record<string, DanceMove> = {
  J: 'jump',
  D: 'disco',
  '1': 'disco',
  S: 'spin',
  '2': 'spin',
  W: 'wave',
  '3': 'wave',
  C: 'clap',
  '4': 'clap',
  R: 'robot',
  '5': 'robot',
  K: 'kick',
  '6': 'kick',
  B: 'boogie',
  '7': 'boogie',
}

const MOVE_NOTES: Record<DanceMove, readonly number[]> = {
  jump: [7, 9, 10, 12],
  disco: [5, 7, 9, 12],
  spin: [4, 6, 8, 11],
  wave: [2, 4, 5, 7],
  clap: [5, 5, 7, 9],
  robot: [0, 2, 0, 4],
  kick: [1, 3, 5, 8],
  boogie: [3, 5, 7, 10],
}

const MOVE_SHAPES: Record<DanceMove, ShapeKey> = {
  jump: 'star',
  disco: 'star',
  spin: 'ring',
  wave: 'heart',
  clap: 'circle',
  robot: 'square',
  kick: 'triangle',
  boogie: 'heart',
}

/**
 * Pick a deterministic dance move for any keyboard press or pointer location.
 */
export function selectDanceMove(
  event: { char?: string; x: number; y: number; index: number; source: 'key' | 'pointer' },
  width: number,
  height: number,
): DanceMove {
  const safeIdx = Math.abs(Math.trunc(event.index)) || 0

  if (event.source === 'key') {
    const ch = (event.char ?? '').trim().toUpperCase()
    if (ch) {
      const mapped = KEY_TO_MOVE[ch]
      if (mapped) return mapped
      return DANCE_MOVES[ch.charCodeAt(0) % DANCE_MOVES.length]
    }
    return DANCE_MOVES[safeIdx % DANCE_MOVES.length]
  }

  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const col = event.x < w / 3 ? 0 : event.x < (w * 2) / 3 ? 1 : 2
  const row = event.y < h / 3 ? 0 : event.y < (h * 2) / 3 ? 1 : 2

  if (row === 0) {
    if (col === 0) return 'disco'
    if (col === 1) return 'jump'
    return 'wave'
  }
  if (row === 1) {
    if (col === 0) return 'robot'
    if (col === 2) return 'spin'
    return safeIdx % 2 === 0 ? 'clap' : 'boogie'
  }
  if (col === 0) return 'kick'
  if (col === 2) return 'boogie'
  return safeIdx % 2 === 0 ? 'kick' : 'boogie'
}

/** Map a dance move and beat step to a pentatonic scale index (0..14). */
export function danceNoteForMove(move: DanceMove, step: number): number {
  const motif = MOVE_NOTES[move]
  const idx = Math.abs(Math.trunc(step)) % motif.length
  return motif[idx]
}

/** Map each dance move to a pooled shape texture for burst particles and companion matches. */
export function danceShapeForMove(move: DanceMove): ShapeKey {
  return MOVE_SHAPES[move]
}

/**
 * Forward kinematics for a two-segment limb (shoulder->elbow->hand or hip->knee->foot).
 * Angles are in radians measured from straight down (+Y):
 * `0` = straight down, positive swings right (+X), negative swings left (-X).
 * `lowerAngle` is relative to `upperAngle` so `0` keeps the limb straight.
 */
export function computeLimbJoints(
  originX: number,
  originY: number,
  upperLen: number,
  lowerLen: number,
  upperAngle: number,
  lowerAngle: number,
): LimbJoints {
  const midX = originX + Math.sin(upperAngle) * upperLen
  const midY = originY + Math.cos(upperAngle) * upperLen
  const totalLower = upperAngle + lowerAngle
  const endX = midX + Math.sin(totalLower) * lowerLen
  const endY = midY + Math.cos(totalLower) * lowerLen
  return { midX, midY, endX, endY }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Compute full articulated human dancer pose for either an active move or idle groove.
 * Reference character units use ~160px body height, scaled by renderer viewport.
 */
export function computeDancerPose(opts: {
  move: DanceMove | null
  moveProgress: number
  idlePhase: number
  step: number
  pointerTarget?: { dx: number; dy: number } | null
}): DancerPose {
  const t = clamp(opts.moveProgress, 0, 1)
  const dir = opts.step % 2 === 0 ? 1 : -1
  const bounce = Math.sin(opts.idlePhase * 2)
  const sway = Math.sin(opts.idlePhase)

  // Gentle breathing idle groove
  let offsetX = sway * 4
  let offsetY = Math.abs(bounce) * -4
  let torsoTilt = sway * 0.06
  let headTilt = -sway * 0.07
  let squashX = 1 + bounce * 0.02
  let squashY = 1 - bounce * 0.025
  let spinPhase = 0
  let leftShoulderAngle = -0.3 + sway * 0.14
  let leftElbowAngle = 0.25 + bounce * 0.1
  let rightShoulderAngle = 0.3 + sway * 0.14
  let rightElbowAngle = -0.25 - bounce * 0.1
  let leftHipAngle = -0.14 - sway * 0.04
  let leftKneeAngle = 0.06 + Math.max(0, bounce) * 0.08
  let rightHipAngle = 0.14 - sway * 0.04
  let rightKneeAngle = -0.06 - Math.max(0, -bounce) * 0.08
  let expression: DancerExpression = 'smile'

  if (opts.move !== null) {
    const bell = Math.sin(t * Math.PI)
    const swing = Math.sin(t * Math.PI * 2)
    expression = bell > 0.25 ? 'joy' : 'smile'

    switch (opts.move) {
      case 'jump': {
        // Anticipation squat at start/end, joyful star-jump in the air
        const arc = Math.sin(t * Math.PI)
        const squat = t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : t > 0.84 ? Math.sin(((1 - t) / 0.16) * Math.PI) : 0
        offsetY = -58 * arc + 10 * squat
        squashX = 1 + 0.16 * squat - 0.1 * arc
        squashY = 1 - 0.16 * squat + 0.12 * arc
        torsoTilt = dir * 0.08 * arc
        headTilt = -dir * 0.08 * arc
        leftShoulderAngle = lerp(-0.35, -2.55, arc)
        leftElbowAngle = lerp(0.2, 0.25, arc)
        rightShoulderAngle = lerp(0.35, 2.55, arc)
        rightElbowAngle = lerp(-0.2, -0.25, arc)
        leftHipAngle = lerp(-0.15, -0.58, arc)
        leftKneeAngle = lerp(0.1, 0.35, arc)
        rightHipAngle = lerp(0.15, 0.58, arc)
        rightKneeAngle = lerp(-0.1, -0.35, arc)
        expression = 'joy'
        break
      }
      case 'disco': {
        const beat = Math.sin(t * Math.PI)
        const pulse = Math.sin(t * Math.PI * 2)
        offsetX = dir * 14 * beat
        offsetY = -12 * Math.abs(pulse)
        torsoTilt = -dir * 0.22 * beat
        headTilt = dir * 0.16 * beat
        squashX = 1 + 0.06 * Math.abs(pulse)
        squashY = 1 - 0.05 * Math.abs(pulse)
        if (dir > 0) {
          // Right arm points high diagonally; left hand on hip
          rightShoulderAngle = lerp(0.35, 2.45 + 0.15 * pulse, beat)
          rightElbowAngle = lerp(-0.2, -0.08, beat)
          leftShoulderAngle = lerp(-0.35, -0.95, beat)
          leftElbowAngle = lerp(0.2, 1.55, beat)
        } else {
          // Left arm points high diagonally; right hand on hip
          leftShoulderAngle = lerp(-0.35, -2.45 - 0.15 * pulse, beat)
          leftElbowAngle = lerp(0.2, 0.08, beat)
          rightShoulderAngle = lerp(0.35, 0.95, beat)
          rightElbowAngle = lerp(-0.2, -1.55, beat)
        }
        leftHipAngle = -0.22 - 0.16 * beat
        leftKneeAngle = 0.28 * beat
        rightHipAngle = 0.22 + 0.16 * beat
        rightKneeAngle = -0.28 * beat
        expression = 'sing'
        break
      }
      case 'spin': {
        spinPhase = t
        const arc = Math.sin(t * Math.PI)
        offsetY = -20 * arc
        squashX = 1 - 0.08 * arc
        squashY = 1 + 0.08 * arc
        torsoTilt = dir * 0.12 * Math.sin(t * Math.PI * 2)
        headTilt = -torsoTilt * 0.5
        leftShoulderAngle = lerp(-0.35, -1.75, arc)
        leftElbowAngle = lerp(0.2, 0.45, arc)
        rightShoulderAngle = lerp(0.35, 1.75, arc)
        rightElbowAngle = lerp(-0.2, -0.45, arc)
        leftHipAngle = -0.18 + 0.24 * swing
        leftKneeAngle = 0.2 * arc
        rightHipAngle = 0.18 - 0.24 * swing
        rightKneeAngle = -0.2 * arc
        expression = 'joy'
        break
      }
      case 'wave': {
        const waveCycle = Math.sin(t * Math.PI * 4)
        offsetX = 10 * swing
        offsetY = -8 * bell
        torsoTilt = 0.16 * swing
        headTilt = -0.18 * swing
        leftShoulderAngle = lerp(-0.35, -2.35, bell) + 0.22 * waveCycle
        leftElbowAngle = -0.45 * waveCycle
        rightShoulderAngle = lerp(0.35, 2.35, bell) + 0.22 * waveCycle
        rightElbowAngle = 0.45 * waveCycle
        leftHipAngle = -0.18 + 0.08 * swing
        rightHipAngle = 0.18 + 0.08 * swing
        expression = 'sing'
        break
      }
      case 'clap': {
        const clapBeat = Math.abs(Math.sin(t * Math.PI * 2))
        const hop = Math.abs(Math.sin(t * Math.PI * 2))
        offsetY = -18 * hop
        squashX = 1 + 0.08 * (1 - clapBeat)
        squashY = 1 - 0.06 * (1 - clapBeat)
        torsoTilt = 0.06 * swing
        // Arms swing wide then snap inward so hands meet overhead/chest
        leftShoulderAngle = lerp(-1.35, -0.65, clapBeat)
        leftElbowAngle = lerp(0.65, 2.85, clapBeat)
        rightShoulderAngle = lerp(1.35, 0.65, clapBeat)
        rightElbowAngle = lerp(-0.65, -2.85, clapBeat)
        leftHipAngle = -0.22 * hop - 0.12
        leftKneeAngle = 0.35 * hop
        rightHipAngle = 0.22 * hop + 0.12
        rightKneeAngle = -0.35 * hop
        expression = 'joy'
        break
      }
      case 'robot': {
        // Stepped mechanical poses
        const snap = Math.floor(t * 4) % 2 === 0 ? 1 : -1
        const stepped = Math.round(t * 4) / 4
        offsetX = snap * 8
        offsetY = -4 * (Math.floor(t * 4) % 2)
        torsoTilt = snap * 0.08
        headTilt = -snap * 0.14
        leftShoulderAngle = -Math.PI / 2
        leftElbowAngle = snap > 0 ? -Math.PI / 2 : Math.PI / 2
        rightShoulderAngle = Math.PI / 2
        rightElbowAngle = snap > 0 ? -Math.PI / 2 : Math.PI / 2
        leftHipAngle = snap > 0 ? -0.32 : -0.1
        leftKneeAngle = snap > 0 ? 0.42 : 0
        rightHipAngle = snap < 0 ? 0.32 : 0.1
        rightKneeAngle = snap < 0 ? -0.42 : 0
        squashX = 1 + 0.03 * Math.sin(stepped * Math.PI * 2)
        expression = 'smile'
        break
      }
      case 'kick': {
        const kickPeak = Math.sin(t * Math.PI)
        offsetX = -dir * 10 * kickPeak
        offsetY = -10 * kickPeak
        torsoTilt = -dir * 0.24 * kickPeak
        headTilt = dir * 0.15 * kickPeak
        squashX = 1 - 0.04 * kickPeak
        squashY = 1 + 0.05 * kickPeak
        leftShoulderAngle = -0.4 - 1.15 * kickPeak
        leftElbowAngle = 0.35
        rightShoulderAngle = 0.4 + 1.15 * kickPeak
        rightElbowAngle = -0.35
        if (dir > 0) {
          rightHipAngle = lerp(0.14, 1.48, kickPeak)
          rightKneeAngle = lerp(-0.06, 0.05, kickPeak)
          leftHipAngle = -0.18
          leftKneeAngle = 0.12 * kickPeak
        } else {
          leftHipAngle = lerp(-0.14, -1.48, kickPeak)
          leftKneeAngle = lerp(0.06, -0.05, kickPeak)
          rightHipAngle = 0.18
          rightKneeAngle = -0.12 * kickPeak
        }
        expression = 'joy'
        break
      }
      case 'boogie': {
        const groove = Math.sin(t * Math.PI * 3)
        const dip = Math.abs(Math.cos(t * Math.PI * 2))
        offsetX = 18 * groove
        offsetY = -12 * (1 - dip) + 10 * dip
        squashX = 1 + 0.1 * dip
        squashY = 1 - 0.1 * dip
        torsoTilt = 0.2 * groove
        headTilt = -0.22 * groove
        leftShoulderAngle = -0.75 + 0.65 * groove
        leftElbowAngle = 1.15 - 0.5 * groove
        rightShoulderAngle = 0.75 + 0.65 * groove
        rightElbowAngle = -1.15 - 0.5 * groove
        leftHipAngle = -0.28 + 0.16 * groove
        leftKneeAngle = 0.52 * dip
        rightHipAngle = 0.28 + 0.16 * groove
        rightKneeAngle = -0.52 * dip
        expression = 'sing'
        break
      }
    }
  }

  // Blend in pointer tracking so dragging a finger leads the dancer gently
  if (opts.pointerTarget) {
    const dx = clamp(opts.pointerTarget.dx, -1, 1)
    const dy = clamp(opts.pointerTarget.dy, -1, 1)
    offsetX += dx * 18
    torsoTilt += dx * 0.18
    headTilt += dx * 0.12
    const reach = opts.move === null ? 0.75 : 0.3
    const rightAngle = Math.PI * 0.55 - dy * 0.75
    const leftAngle = -Math.PI * 0.55 + dy * 0.75
    if (dx >= 0) {
      rightShoulderAngle = lerp(rightShoulderAngle, rightAngle + dx * 0.5, reach)
      rightElbowAngle = lerp(rightElbowAngle, -0.15, reach)
    } else {
      leftShoulderAngle = lerp(leftShoulderAngle, leftAngle + dx * 0.5, reach)
      leftElbowAngle = lerp(leftElbowAngle, 0.15, reach)
    }
  }

  return {
    offsetX,
    offsetY,
    torsoTilt,
    headTilt,
    squashX,
    squashY,
    spinPhase,
    leftShoulderAngle,
    leftElbowAngle,
    rightShoulderAngle,
    rightElbowAngle,
    leftHipAngle,
    leftKneeAngle,
    rightHipAngle,
    rightKneeAngle,
    expression,
  }
}
