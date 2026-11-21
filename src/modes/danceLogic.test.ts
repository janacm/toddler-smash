import { describe, expect, it } from 'vitest'
import {
  computeDancerPose,
  computeLimbJoints,
  DANCE_MOVES,
  danceNoteForMove,
  danceShapeForMove,
  selectDanceMove,
} from './danceLogic'

const VALID_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'ring'] as const

describe('selectDanceMove', () => {
  it('maps designated letter and digit keys deterministically', () => {
    const cases: Array<[string, string]> = [
      ['J', 'jump'],
      ['j', 'jump'],
      ['D', 'disco'],
      ['1', 'disco'],
      ['S', 'spin'],
      ['2', 'spin'],
      ['W', 'wave'],
      ['3', 'wave'],
      ['C', 'clap'],
      ['4', 'clap'],
      ['R', 'robot'],
      ['5', 'robot'],
      ['K', 'kick'],
      ['6', 'kick'],
      ['B', 'boogie'],
      ['7', 'boogie'],
    ]
    for (const [char, expected] of cases) {
      expect(selectDanceMove({ char, x: 0, y: 0, index: 0, source: 'key' }, 1280, 800)).toBe(expected)
    }
  })

  it('maps other printable keys and non-printable keys within DANCE_MOVES', () => {
    const other = selectDanceMove({ char: 'Z', x: 0, y: 0, index: 0, source: 'key' }, 1280, 800)
    expect(DANCE_MOVES).toContain(other)
    expect(selectDanceMove({ char: 'Z', x: 0, y: 0, index: 5, source: 'key' }, 1280, 800)).toBe(other)

    expect(selectDanceMove({ char: '', x: 0, y: 0, index: 0, source: 'key' }, 1280, 800)).toBe(DANCE_MOVES[0])
    expect(selectDanceMove({ char: '', x: 0, y: 0, index: 3, source: 'key' }, 1280, 800)).toBe(DANCE_MOVES[3])
    expect(selectDanceMove({ x: 0, y: 0, index: -2, source: 'key' }, 1280, 800)).toBe(DANCE_MOVES[2])
  })

  it('maps pointer taps across screen regions to distinct dance moves', () => {
    const w = 900
    const h = 900
    expect(selectDanceMove({ x: 100, y: 100, index: 0, source: 'pointer' }, w, h)).toBe('disco')
    expect(selectDanceMove({ x: 450, y: 100, index: 0, source: 'pointer' }, w, h)).toBe('jump')
    expect(selectDanceMove({ x: 800, y: 100, index: 0, source: 'pointer' }, w, h)).toBe('wave')
    expect(selectDanceMove({ x: 100, y: 450, index: 0, source: 'pointer' }, w, h)).toBe('robot')
    expect(selectDanceMove({ x: 450, y: 450, index: 0, source: 'pointer' }, w, h)).toBe('clap')
    expect(selectDanceMove({ x: 450, y: 450, index: 1, source: 'pointer' }, w, h)).toBe('boogie')
    expect(selectDanceMove({ x: 800, y: 450, index: 0, source: 'pointer' }, w, h)).toBe('spin')
    expect(selectDanceMove({ x: 100, y: 800, index: 0, source: 'pointer' }, w, h)).toBe('kick')
    expect(selectDanceMove({ x: 450, y: 800, index: 0, source: 'pointer' }, w, h)).toBe('kick')
    expect(selectDanceMove({ x: 450, y: 800, index: 1, source: 'pointer' }, w, h)).toBe('boogie')
    expect(selectDanceMove({ x: 800, y: 800, index: 0, source: 'pointer' }, w, h)).toBe('boogie')
  })

  it('handles zero or negative viewport dimensions safely', () => {
    const move = selectDanceMove({ x: 50, y: 50, index: 0, source: 'pointer' }, 0, -10)
    expect(DANCE_MOVES).toContain(move)
  })
})

describe('danceNoteForMove and danceShapeForMove', () => {
  it('returns pentatonic indices within 0..14 and valid shapes for all moves', () => {
    for (const move of DANCE_MOVES) {
      for (let step = 0; step < 8; step++) {
        const note = danceNoteForMove(move, step)
        expect(note).toBeGreaterThanOrEqual(0)
        expect(note).toBeLessThan(15)
        expect(Number.isInteger(note)).toBe(true)
      }
      expect(VALID_SHAPES).toContain(danceShapeForMove(move))
    }
  })
})

describe('computeLimbJoints', () => {
  it('points straight down when angles are zero', () => {
    const j = computeLimbJoints(10, 20, 30, 25, 0, 0)
    expect(j.midX).toBeCloseTo(10)
    expect(j.midY).toBeCloseTo(50)
    expect(j.endX).toBeCloseTo(10)
    expect(j.endY).toBeCloseTo(75)
  })

  it('swings right for positive angles and bends lower segment relative to upper', () => {
    const j = computeLimbJoints(0, 0, 20, 15, Math.PI / 2, -Math.PI / 2)
    expect(j.midX).toBeCloseTo(20)
    expect(j.midY).toBeCloseTo(0)
    expect(j.endX).toBeCloseTo(20)
    expect(j.endY).toBeCloseTo(15)
  })
})

describe('computeDancerPose', () => {
  it('produces gentle breathing groove when move is null', () => {
    const p0 = computeDancerPose({ move: null, moveProgress: 0, idlePhase: 0, step: 0 })
    const p1 = computeDancerPose({ move: null, moveProgress: 0, idlePhase: Math.PI / 2, step: 0 })
    expect(p0.expression).toBe('smile')
    expect(p0.spinPhase).toBe(0)
    expect(p1.offsetX).not.toBe(p0.offsetX)
    expect(Number.isFinite(p1.leftShoulderAngle)).toBe(true)
  })

  it('lifts the dancer into the air at jump apex and raises both arms', () => {
    const start = computeDancerPose({ move: 'jump', moveProgress: 0.08, idlePhase: 0, step: 0 })
    const peak = computeDancerPose({ move: 'jump', moveProgress: 0.5, idlePhase: 0, step: 0 })
    const land = computeDancerPose({ move: 'jump', moveProgress: 0.92, idlePhase: 0, step: 0 })
    expect(peak.offsetY).toBeLessThan(-40)
    expect(peak.leftShoulderAngle).toBeLessThan(-2)
    expect(peak.rightShoulderAngle).toBeGreaterThan(2)
    expect(start.squashX).toBeGreaterThan(1)
    expect(land.squashX).toBeGreaterThan(1)
  })

  it('computes distinct finite poses across all 8 dance moves and both step parities', () => {
    for (const move of DANCE_MOVES) {
      for (const step of [0, 1]) {
        for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
          const pose = computeDancerPose({
            move,
            moveProgress: progress,
            idlePhase: 0.4,
            step,
          })
          for (const v of [
            pose.offsetX,
            pose.offsetY,
            pose.torsoTilt,
            pose.headTilt,
            pose.squashX,
            pose.squashY,
            pose.spinPhase,
            pose.leftShoulderAngle,
            pose.leftElbowAngle,
            pose.rightShoulderAngle,
            pose.rightElbowAngle,
            pose.leftHipAngle,
            pose.leftKneeAngle,
            pose.rightHipAngle,
            pose.rightKneeAngle,
          ]) {
            expect(Number.isFinite(v)).toBe(true)
          }
          expect(pose.squashX).toBeGreaterThan(0.5)
          expect(pose.squashY).toBeGreaterThan(0.5)
        }
      }
    }

    const spinMid = computeDancerPose({ move: 'spin', moveProgress: 0.5, idlePhase: 0, step: 0 })
    expect(spinMid.spinPhase).toBeCloseTo(0.5)

    const kickRight = computeDancerPose({ move: 'kick', moveProgress: 0.5, idlePhase: 0, step: 0 })
    const kickLeft = computeDancerPose({ move: 'kick', moveProgress: 0.5, idlePhase: 0, step: 1 })
    expect(kickRight.rightHipAngle).toBeGreaterThan(1)
    expect(kickLeft.leftHipAngle).toBeLessThan(-1)
  })

  it('leans and reaches toward pointerTarget on either side', () => {
    const rightPose = computeDancerPose({
      move: null,
      moveProgress: 0,
      idlePhase: 0,
      step: 0,
      pointerTarget: { dx: 0.8, dy: -0.5 },
    })
    const leftPose = computeDancerPose({
      move: 'boogie',
      moveProgress: 0.5,
      idlePhase: 0,
      step: 0,
      pointerTarget: { dx: -0.9, dy: 0.4 },
    })
    expect(rightPose.torsoTilt).toBeGreaterThan(0)
    expect(rightPose.offsetX).toBeGreaterThan(10)
    expect(leftPose.leftShoulderAngle).toBeLessThan(-0.5)
  })
})
