import Phaser from 'phaser'
import { safeAreaInsets } from '../safeArea'
import { currentMood } from '../settings'
import type { SmashEvent, StrokeEvent, Toy, ToyContext } from '../toys/types'
import {
  computeDancerPose,
  computeLimbJoints,
  danceNoteForMove,
  danceShapeForMove,
  selectDanceMove,
  type DanceMove,
  type DancerPose,
} from './danceLogic'
import type { Mode } from './types'

/**
 * Dance mode: a friendly articulated human stands on a glowing dance stage and
 * performs energetic moves (`jump`, `disco`, `spin`, `wave`, `clap`, `robot`,
 * `kick`, `boogie`) in response to every key press, tap, click, or drag.
 */

interface DancerPalette {
  skin: number
  hair: number
  shirt: number
  pants: number
  shoes: number
  outline: number
  cheek: number
  sole: number
}

const DAY_DANCER: DancerPalette = {
  skin: 0xf6c29b,
  hair: 0x4b2e2b,
  shirt: 0xe63946,
  pants: 0x277da1,
  shoes: 0xf77f00,
  outline: 0x232946,
  cheek: 0xf48c94,
  sole: 0xffffff,
}

const NIGHT_DANCER: DancerPalette = {
  skin: 0xd9b39c,
  hair: 0x524663,
  shirt: 0xd7bde2,
  pants: 0x9ad0ec,
  shoes: 0xf6c28b,
  outline: 0x2a2f52,
  cheek: 0xd49ea9,
  sole: 0xe2e8f0,
}

const BACKUP_SHIRTS_DAY = [0x2a9d8f, 0x7b2cbf] as const
const BACKUP_SHIRTS_NIGHT = [0xa8e6cf, 0xb8b5ff] as const
const PUZZLE_MOVES: readonly DanceMove[] = ['disco', 'wave', 'jump']

let graphics: Phaser.GameObjects.Graphics | undefined
let playground = false
let puzzleActive = false
let activeMove: DanceMove | null = null
let moveStartedAt = -Infinity
let moveDurationMs = 580
let stepCount = 0
let accentSeed = 0
let activeTile = -1
let pointerTarget: { dx: number; dy: number } | null = null
let lastDragPoint: { x: number; y: number } | null = null

function stageGeometry(width: number, height: number): {
  cx: number
  floorY: number
  scale: number
  backupOffsetX: number
} {
  const insets = safeAreaInsets()
  const compact = height < 500
  const isPortraitPhone = width < 600 && height >= 500

  if (puzzleActive) {
    if (compact) {
      return {
        cx: insets.left + Math.max(76, width * 0.13),
        floorY: height - insets.bottom - 78,
        scale: Math.min(0.68, Math.max(0.45, (height - insets.top - 150) / 185)),
        backupOffsetX: 64,
      }
    }
    if (isPortraitPhone) {
      const floorY = Math.min(height * 0.67, height - insets.bottom - 260)
      const scale = Math.min(0.86, Math.max(0.56, (floorY - 405) / 150))
      return {
        cx: width / 2,
        floorY,
        scale,
        backupOffsetX: Math.min(110, width * 0.27),
      }
    }
    const floorY = Math.min(height - insets.bottom - 102, height * 0.87)
    return {
      cx: width / 2,
      floorY,
      scale: Math.min(0.82, Math.max(0.6, (floorY - height * 0.56) / 170)),
      backupOffsetX: Math.min(140, width * 0.2),
    }
  }

  if (compact) {
    const floorY = height - insets.bottom - 94
    const scale = Math.min(1.0, Math.max(0.58, (floorY - insets.top - 90) / 185))
    return {
      cx: width / 2,
      floorY,
      scale,
      backupOffsetX: Math.min(140, width * 0.22),
    }
  }

  if (isPortraitPhone) {
    const floorY = Math.min(height * 0.65, height - insets.bottom - 255)
    const topClear = insets.top + 225
    const scale = Math.min(1.28, Math.max(0.75, (floorY - topClear) / 215))
    return {
      cx: width / 2,
      floorY,
      scale,
      backupOffsetX: Math.min(112, width * 0.28),
    }
  }

  const floorY = Math.min(height * 0.72, height - insets.bottom - 125)
  const scale = Math.min(1.65, Math.max(0.85, (floorY - insets.top - 120) / 225))
  return {
    cx: width / 2,
    floorY,
    scale,
    backupOffsetX: Math.min(190, width * 0.2),
  }
}

function setPlayground(active: boolean): void {
  playground = active
}

function setPuzzleActive(active: boolean): void {
  puzzleActive = active
}

function triggerMove(move: DanceMove, seed: number, ctx: ToyContext, playChime = false): void {
  const now = ctx.scene.time.now
  activeMove = move
  moveStartedAt = now
  moveDurationMs = Math.round(580 / Math.max(0.25, currentMood().timeScale))
  stepCount++
  accentSeed = seed
  activeTile = Math.abs(seed) % 5

  const noteIndex = danceNoteForMove(move, stepCount)
  ctx.synth.play(noteIndex, 'piano', playChime ? 0.75 : 0.85)
  if (!playChime) {
    ctx.synth.play((noteIndex + 2) % 15, 'pop', 0.4)
  }
}

function spawnDanceEffects(e: SmashEvent, move: DanceMove, ctx: ToyContext): void {
  const stage = stageGeometry(ctx.width, ctx.height)
  const color = ctx.color(e.index)
  const shape = danceShapeForMove(move)
  const { speedScale } = ctx.mood.motion
  const { shapeMs, glyphMs } = ctx.mood.decay

  // Floor pulse ring under the dancer
  const ring = ctx.pool.spawn('ring', stage.cx, stage.floorY)
  ring.setTint(color)
  ring.setScale(0.35 * stage.scale)
  ring.setAlpha(0.75)
  ctx.scene.tweens.add({
    targets: ring,
    scaleX: 1.55 * stage.scale,
    scaleY: 0.55 * stage.scale,
    alpha: 0,
    duration: 520,
    ease: 'Cubic.easeOut',
  })
  ctx.pool.retire(ring, 350, 200)

  // Floating musical note near the dancer
  const noteX = stage.cx + ctx.rng.between(-55, 55) * stage.scale
  const noteY = stage.floorY - 120 * stage.scale
  const note = ctx.pool.spawn('note', noteX, noteY)
  note.setTint(ctx.color(e.index + 2))
  note.setScale(0.45 * Math.min(1.2, stage.scale))
  note.setAngle(ctx.rng.between(-18, 18))
  ctx.scene.tweens.add({
    targets: note,
    x: noteX + ctx.rng.between(-45, 45) * speedScale,
    y: noteY - ctx.rng.between(90, 160) * speedScale,
    angle: ctx.rng.between(-28, 28),
    duration: 1100,
    ease: 'Sine.easeOut',
  })
  ctx.pool.retire(note, 700, 450)

  // Move-matched shape burst at input point (or near dancer)
  const burstX = e.source === 'pointer' ? e.x : stage.cx + ctx.rng.between(-90, 90) * stage.scale
  const burstY = e.source === 'pointer' ? e.y : stage.floorY - ctx.rng.between(50, 140) * stage.scale
  const badge = ctx.pool.spawn(shape, burstX, burstY)
  badge.setTint(color)
  badge.setScale(0.18)
  ctx.scene.tweens.add({
    targets: badge,
    scale: 0.48 * Math.min(1.2, stage.scale),
    y: burstY - 60 * speedScale,
    angle: ctx.rng.between(-35, 35),
    duration: 420,
    ease: 'Back.easeOut',
  })
  ctx.pool.retire(badge, Math.round(shapeMs * 0.45), 400)

  // Pressed letter pops cleanly
  if (e.char) {
    const txt = ctx.text.spawn(e.char, e.x, e.y, 100)
    txt.setColor('#' + color.toString(16).padStart(6, '0'))
    txt.setScale(0.3)
    ctx.scene.tweens.add({ targets: txt, scale: 1, duration: 280, ease: 'Back.easeOut' })
    ctx.scene.tweens.add({
      targets: txt,
      y: Math.max(70, e.y - 120 * speedScale),
      duration: 1200,
      ease: 'Sine.easeOut',
    })
    ctx.text.retire(txt, Math.round(glyphMs * 0.5))
  }

  const colorIndex = Math.abs(e.index) % ctx.mood.palette.length
  ctx.checkMatch?.({ colorIndex, shape })
}

function drawStage(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  floorY: number,
  scale: number,
  now: number,
  ctx: ToyContext,
  night: boolean,
): void {
  const tileCount = 5
  const stageW = 240 * scale
  const tileW = stageW / tileCount
  const stageH = 26 * scale
  const startX = cx - stageW / 2

  // Outer stage glow
  g.fillStyle(ctx.color(accentSeed), night ? 0.16 : 0.12)
  g.fillEllipse(cx, floorY + 4 * scale, stageW * 1.18, stageH * 1.8)

  // Stage base rim
  g.fillStyle(night ? 0x1e2547 : 0x334155, 0.45)
  g.fillRoundedRect(startX - 8 * scale, floorY - stageH * 0.45, stageW + 16 * scale, stageH + 8 * scale, 14 * scale)

  // Five glowing dance tiles
  const pulse = 0.5 + 0.5 * Math.sin(now / (night ? 520 : 280))
  for (let i = 0; i < tileCount; i++) {
    const tx = startX + i * tileW + 3 * scale
    const tw = tileW - 6 * scale
    const lit = i === activeTile
    const color = ctx.color(i + Math.floor(stepCount / 2))
    const alpha = lit ? 0.92 : night ? 0.35 + pulse * 0.12 : 0.48 + pulse * 0.14
    g.fillStyle(color, alpha)
    g.fillRoundedRect(tx, floorY - stageH * 0.32, tw, stageH * 0.72, 7 * scale)
  }
}

function drawHuman(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  floorY: number,
  scale: number,
  pose: DancerPose,
  palette: DancerPalette,
  accentColor: number,
): void {
  const spinCos = Math.cos(pose.spinPhase * Math.PI * 2)
  const facingBack = spinCos < -0.15
  const widthScale = Math.max(0.28, Math.abs(spinCos)) * pose.squashX
  const heightScale = pose.squashY
  const sX = scale * widthScale
  const sY = scale * heightScale

  // Drop shadow on floor (shrinks when jumping)
  const jumpLift = Math.max(0, -pose.offsetY)
  const shadowScale = Math.max(0.45, 1 - jumpLift / 110)
  g.fillStyle(0x0f172a, 0.18 * shadowScale)
  g.fillEllipse(cx + pose.offsetX * scale, floorY + 2 * scale, 74 * scale * shadowScale, 16 * scale * shadowScale)

  const anchorX = cx + pose.offsetX * scale
  const anchorY = floorY + pose.offsetY * scale

  // Hip center is 62 units above anchor ground
  const hipX = anchorX
  const hipY = anchorY - 62 * sY

  const sinT = Math.sin(pose.torsoTilt)
  const cosT = Math.cos(pose.torsoTilt)
  const torsoLen = 48 * sY
  const shoulderX = hipX + sinT * torsoLen
  const shoulderY = hipY - cosT * torsoLen

  const limbWidth = 10 * scale
  const outlineWidth = 14 * scale
  const dirSign = spinCos >= 0 ? 1 : -1

  const resolveLimb = (
    ox: number,
    oy: number,
    upperLen: number,
    lowerLen: number,
    upperAngle: number,
    lowerAngle: number,
  ) => {
    const joints = computeLimbJoints(ox, oy, upperLen * sY, lowerLen * sY, upperAngle * dirSign, lowerAngle * dirSign)
    return {
      ox,
      oy,
      midX: ox + (joints.midX - ox) * widthScale,
      midY: joints.midY,
      endX: ox + (joints.endX - ox) * widthScale,
      endY: joints.endY,
    }
  }

  // 1. Legs (hip -> knee -> foot)
  const hipHalf = 11 * sX
  const leftLeg = resolveLimb(hipX - cosT * hipHalf, hipY - sinT * hipHalf, 28, 28, pose.leftHipAngle, pose.leftKneeAngle)
  const rightLeg = resolveLimb(hipX + cosT * hipHalf, hipY + sinT * hipHalf, 28, 28, pose.rightHipAngle, pose.rightKneeAngle)

  for (const leg of [leftLeg, rightLeg]) {
    g.lineStyle(outlineWidth, palette.outline, 1)
    g.lineBetween(leg.ox, leg.oy, leg.midX, leg.midY)
    g.lineBetween(leg.midX, leg.midY, leg.endX, leg.endY)
    g.fillStyle(palette.outline, 1)
    g.fillCircle(leg.ox, leg.oy, outlineWidth / 2)
    g.fillCircle(leg.midX, leg.midY, outlineWidth / 2)

    g.lineStyle(limbWidth, palette.pants, 1)
    g.lineBetween(leg.ox, leg.oy, leg.midX, leg.midY)
    g.lineBetween(leg.midX, leg.midY, leg.endX, leg.endY)
    g.fillStyle(palette.pants, 1)
    g.fillCircle(leg.ox, leg.oy, limbWidth / 2)
    g.fillCircle(leg.midX, leg.midY, limbWidth / 2)

    g.fillStyle(palette.outline, 1)
    g.fillEllipse(leg.endX, leg.endY + 2 * scale, 18 * scale, 12 * scale)
    g.fillStyle(palette.shoes, 1)
    g.fillEllipse(leg.endX, leg.endY + 1 * scale, 14 * scale, 8.5 * scale)
    g.fillStyle(palette.sole, 1)
    g.fillRoundedRect(leg.endX - 6 * scale, leg.endY + 3.5 * scale, 12 * scale, 2.5 * scale, 1 * scale)
  }

  // Arm endpoints anchored slightly inside shoulder edge for seamless sleeves
  const shoulderHalf = 15 * sX
  const leftArm = resolveLimb(
    shoulderX - cosT * shoulderHalf,
    shoulderY - sinT * shoulderHalf,
    23,
    21,
    pose.leftShoulderAngle,
    pose.leftElbowAngle,
  )
  const rightArm = resolveLimb(
    shoulderX + cosT * shoulderHalf,
    shoulderY + sinT * shoulderHalf,
    23,
    21,
    pose.rightShoulderAngle,
    pose.rightElbowAngle,
  )

  // 2. Torso outline & upper-arm outlines (smooth rounded caps at shoulder & elbow)
  const torsoW = 28 * sX
  const midTorsoX = (hipX + shoulderX) / 2
  const midTorsoY = (hipY + shoulderY) / 2
  g.lineStyle(torsoW + 4 * scale, palette.outline, 1)
  g.lineBetween(hipX, hipY, shoulderX, shoulderY)
  g.fillStyle(palette.outline, 1)
  g.fillCircle(hipX, hipY, (torsoW + 4 * scale) / 2)
  g.fillCircle(shoulderX, shoulderY, (torsoW + 4 * scale) / 2)

  for (const arm of [leftArm, rightArm]) {
    g.lineStyle(outlineWidth, palette.outline, 1)
    g.lineBetween(arm.ox, arm.oy, arm.midX, arm.midY)
    g.fillStyle(palette.outline, 1)
    g.fillCircle(arm.ox, arm.oy, outlineWidth / 2)
    g.fillCircle(arm.midX, arm.midY, outlineWidth / 2)
  }

  // 3. Torso fill, shorts band & chest badge (merges shoulder roots into shirt)
  g.lineStyle(torsoW, palette.shirt, 1)
  g.lineBetween(hipX, hipY, shoulderX, shoulderY)
  g.fillStyle(palette.shirt, 1)
  g.fillCircle(hipX, hipY, torsoW / 2)
  g.fillCircle(shoulderX, shoulderY, torsoW / 2)

  g.fillStyle(palette.pants, 1)
  g.fillEllipse(hipX, hipY + 3 * sY, torsoW * 0.96, 13 * sY)

  if (!facingBack) {
    g.fillStyle(accentColor, 0.95)
    g.fillCircle(midTorsoX, midTorsoY - 4 * sY, 6.5 * Math.min(sX, sY))
    g.fillStyle(0xffffff, 0.75)
    g.fillCircle(midTorsoX, midTorsoY - 4 * sY, 3 * Math.min(sX, sY))
  }

  // 4. Upper-arm fills (shirt sleeves)
  for (const arm of [leftArm, rightArm]) {
    g.lineStyle(limbWidth, palette.shirt, 1)
    g.lineBetween(arm.ox, arm.oy, arm.midX, arm.midY)
    g.fillStyle(palette.shirt, 1)
    g.fillCircle(arm.ox, arm.oy, limbWidth / 2)
    g.fillCircle(arm.midX, arm.midY, limbWidth / 2)
  }

  // 5. Forearm outlines, forearm fills & hands (keep outline even when crossing chest)
  for (const arm of [leftArm, rightArm]) {
    g.lineStyle(outlineWidth, palette.outline, 1)
    g.lineBetween(arm.midX, arm.midY, arm.endX, arm.endY)
    g.fillStyle(palette.outline, 1)
    g.fillCircle(arm.midX, arm.midY, outlineWidth / 2)

    g.lineStyle(limbWidth, palette.skin, 1)
    g.lineBetween(arm.midX, arm.midY, arm.endX, arm.endY)
    g.fillStyle(palette.skin, 1)
    g.fillCircle(arm.midX, arm.midY, limbWidth / 2)

    g.fillStyle(palette.outline, 1)
    g.fillCircle(arm.endX, arm.endY, 7.5 * scale)
    g.fillStyle(palette.skin, 1)
    g.fillCircle(arm.endX, arm.endY, 5.5 * scale)
  }

  // Head
  const headAngle = pose.torsoTilt + pose.headTilt
  const headX = shoulderX + Math.sin(headAngle) * 32 * sY
  const headY = shoulderY - Math.cos(headAngle) * 32 * sY
  const headRX = 23 * Math.max(0.75, widthScale) * scale * pose.squashX
  const headRY = 23 * sY

  // Neck
  g.lineStyle(10 * scale, palette.outline, 1)
  g.lineBetween(shoulderX, shoulderY - 4 * sY, headX, headY + 8 * sY)
  g.lineStyle(6.5 * scale, palette.skin, 1)
  g.lineBetween(shoulderX, shoulderY - 4 * sY, headX, headY + 8 * sY)

  // Head base
  g.fillStyle(palette.outline, 1)
  g.fillEllipse(headX, headY, (headRX + 2.5 * scale) * 2, (headRY + 2.5 * scale) * 2)
  g.fillStyle(palette.skin, 1)
  g.fillEllipse(headX, headY, headRX * 2, headRY * 2)

  // Hair cap & joyful curl tuft
  if (facingBack) {
    g.fillStyle(palette.hair, 1)
    g.fillEllipse(headX, headY - 2 * sY, headRX * 2.02, headRY * 1.95)
    g.fillCircle(headX + 4 * sX, headY - headRY * 0.95, 7 * scale)
  } else {
    g.fillStyle(palette.hair, 1)
    g.fillEllipse(headX, headY - headRY * 0.62, headRX * 1.88, headRY * 0.92)
    g.fillCircle(headX - headRX * 0.78, headY - headRY * 0.25, 6.5 * scale)
    g.fillCircle(headX + headRX * 0.78, headY - headRY * 0.25, 6.5 * scale)
    // Playful top hair tuft
    g.fillCircle(headX - 3 * sX, headY - headRY * 1.04, 6.5 * scale)
    g.fillCircle(headX + 5 * sX, headY - headRY * 0.98, 5.5 * scale)

    // Rosy cheeks
    g.fillStyle(palette.cheek, 0.75)
    g.fillEllipse(headX - headRX * 0.56, headY + 4 * sY, 8 * sX, 5 * sY)
    g.fillEllipse(headX + headRX * 0.56, headY + 4 * sY, 8 * sX, 5 * sY)

    // Eyes
    const eyeY = headY - 2 * sY
    const eyeOffset = headRX * 0.36
    if (pose.expression === 'joy') {
      g.lineStyle(2.8 * scale, palette.outline, 1)
      g.beginPath()
      g.arc(headX - eyeOffset, eyeY + 2 * sY, 4.5 * scale, Math.PI * 1.1, Math.PI * 1.9)
      g.strokePath()
      g.beginPath()
      g.arc(headX + eyeOffset, eyeY + 2 * sY, 4.5 * scale, Math.PI * 1.1, Math.PI * 1.9)
      g.strokePath()
    } else {
      g.fillStyle(0xffffff, 1)
      g.fillCircle(headX - eyeOffset, eyeY, 4.8 * scale)
      g.fillCircle(headX + eyeOffset, eyeY, 4.8 * scale)
      g.fillStyle(palette.outline, 1)
      g.fillCircle(headX - eyeOffset + 0.6 * sX, eyeY, 2.7 * scale)
      g.fillCircle(headX + eyeOffset + 0.6 * sX, eyeY, 2.7 * scale)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(headX - eyeOffset + 1.4 * sX, eyeY - 1.2 * sY, 1.1 * scale)
      g.fillCircle(headX + eyeOffset + 1.4 * sX, eyeY - 1.2 * sY, 1.1 * scale)
    }

    // Mouth
    const mouthY = headY + 7 * sY
    if (pose.expression === 'sing') {
      g.fillStyle(palette.outline, 1)
      g.fillEllipse(headX, mouthY + 1 * sY, 7.5 * scale, 8.5 * scale)
      g.fillStyle(palette.cheek, 1)
      g.fillEllipse(headX, mouthY + 2.5 * sY, 4.5 * scale, 3.5 * scale)
    } else if (pose.expression === 'joy') {
      g.fillStyle(palette.outline, 1)
      g.fillEllipse(headX, mouthY + 1 * sY, 12 * scale, 8 * scale)
      g.fillStyle(palette.cheek, 1)
      g.fillEllipse(headX, mouthY + 2.5 * sY, 7 * scale, 4 * scale)
    } else {
      g.lineStyle(2.6 * scale, palette.outline, 1)
      g.beginPath()
      g.arc(headX, mouthY - 1 * sY, 6 * scale, Math.PI * 0.15, Math.PI * 0.85)
      g.strokePath()
    }
  }
}

function render(ctx: ToyContext): void {
  const g = graphics
  if (!g || !g.active) return
  g.clear()

  const now = ctx.scene.time.now
  const night = currentMood().night
  const timeScale = currentMood().timeScale
  const stage = stageGeometry(ctx.width, ctx.height)

  let move: DanceMove | null = activeMove
  let progress = 0
  if (move !== null) {
    const elapsed = now - moveStartedAt
    if (elapsed >= moveDurationMs || elapsed < 0) {
      activeMove = null
      move = null
    } else {
      progress = elapsed / moveDurationMs
    }
  }

  const idlePhase = (now / 1000) * Math.PI * 1.8 * timeScale
  const mainPose = computeDancerPose({
    move,
    moveProgress: progress,
    idlePhase,
    step: stepCount,
    pointerTarget,
  })

  drawStage(g, stage.cx, stage.floorY, stage.scale, now, ctx, night)

  const basePalette = night ? NIGHT_DANCER : DAY_DANCER
  const backupShirts = night ? BACKUP_SHIRTS_NIGHT : BACKUP_SHIRTS_DAY

  if (playground) {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      const bx = stage.cx + side * stage.backupOffsetX
      const by = stage.floorY - 6 * stage.scale
      const bScale = stage.scale * 0.66
      const backupPose = computeDancerPose({
        move,
        moveProgress: progress,
        idlePhase: idlePhase + (i + 1) * 0.6,
        step: stepCount + i + 1,
        pointerTarget,
      })
      g.fillStyle(ctx.color(i + 3), night ? 0.25 : 0.32)
      g.fillEllipse(bx, by + 2 * bScale, 92 * bScale, 18 * bScale)
      drawHuman(
        g,
        bx,
        by,
        bScale,
        backupPose,
        { ...basePalette, shirt: backupShirts[i] },
        ctx.color(accentSeed + i + 1),
      )
    }
  }

  drawHuman(g, stage.cx, stage.floorY, stage.scale, mainPose, basePalette, ctx.color(accentSeed))
}

function enter(ctx: ToyContext): () => void {
  setPlayground(false)
  activeMove = null
  pointerTarget = null
  lastDragPoint = null
  activeTile = -1

  const g = ctx.scene.add.graphics().setDepth(-80)
  graphics = g

  const timer = ctx.scene.time.addEvent({
    delay: 30,
    loop: true,
    callback: () => {
      try {
        render(ctx)
      } catch {
        /* Never let rendering stop play. */
      }
    },
  })

  render(ctx)

  return () => {
    setPlayground(false)
    setPuzzleActive(false)
    timer.remove()
    pointerTarget = null
    lastDragPoint = null
    activeMove = null
    if (graphics === g) graphics = undefined
    g.destroy()
  }
}

function stroke(e: StrokeEvent, ctx: ToyContext): void {
  if (e.phase === 'end') {
    pointerTarget = null
    lastDragPoint = null
    return
  }

  const stage = stageGeometry(ctx.width, ctx.height)
  const dx = (e.x - stage.cx) / Math.max(120, ctx.width * 0.35)
  const dy = (e.y - (stage.floorY - 80 * stage.scale)) / Math.max(120, ctx.height * 0.35)
  pointerTarget = { dx, dy }

  if (!lastDragPoint) {
    lastDragPoint = { x: e.x, y: e.y }
    return
  }

  const dist = Math.hypot(e.x - lastDragPoint.x, e.y - lastDragPoint.y)
  if (dist >= 110) {
    lastDragPoint = { x: e.x, y: e.y }
    const move = selectDanceMove(
      { x: e.x, y: e.y, index: stepCount, source: 'pointer' },
      ctx.width,
      ctx.height,
    )
    triggerMove(move, stepCount, ctx)
    const note = ctx.pool.spawn('note', e.x, e.y)
    note.setTint(ctx.color(stepCount))
    note.setScale(0.38)
    ctx.scene.tweens.add({
      targets: note,
      y: e.y - 80 * ctx.mood.motion.speedScale,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeOut',
    })
    ctx.pool.retire(note, 400, 220)
    const colorIndex = Math.abs(stepCount) % ctx.mood.palette.length
    ctx.checkMatch?.({ colorIndex, shape: danceShapeForMove(move) })
  }
}

function replayNote(index: number, ctx: ToyContext): void {
  const move = PUZZLE_MOVES[Math.abs(Math.trunc(index)) % PUZZLE_MOVES.length]
  triggerMove(move, index, ctx, true)
  render(ctx)
}

const danceStep: Toy = {
  name: 'danceStep',
  match: () => true,
  play(e, ctx) {
    const move = selectDanceMove(e, ctx.width, ctx.height)
    triggerMove(move, e.index, ctx)
    spawnDanceEffects(e, move, ctx)
  },
}

export const dance: Mode = {
  name: 'dance',
  label: 'Dance',
  icon: 'iconDancer',
  toys: [danceStep],
  enter,
  stroke,
  setPlayground,
  setPuzzleActive,
  replayNote,
  resetDiscovery: () => {
    activeMove = null
    stepCount = 0
    activeTile = -1
    pointerTarget = null
    lastDragPoint = null
  },
}
