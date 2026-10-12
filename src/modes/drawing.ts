import Phaser from 'phaser'
import { CONFIG } from '../config'
import { SHAPE_KEYS } from '../textures'
import type { SmashEvent, StrokeEvent, Toy, ToyContext } from '../toys/types'
import { brushPx, noteForY, strokePoints } from './drawingMath'
import type { Mode } from './types'

/**
 * Finger painting. Drag anywhere to draw a fat line that drifts through the
 * palette and hums notes as it goes (higher up the screen, higher the note).
 * Keys stamp a sticker: the letter or number pressed, or a shape.
 *
 * The drawing slowly fades, so the screen never fills up and there's no
 * "clear" button for a toddler to need or find.
 */

interface Stroke {
  x: number
  y: number
  travelled: number
  sinceNote: number
  seed: number
}

const BRUSH = 'circle'
const BRUSH_TEXTURE_PX = 120

let canvas: Phaser.GameObjects.RenderTexture | undefined
const strokes = new Map<number, Stroke>()
let strokeCount = 0

function strokeColor(ctx: ToyContext, s: Stroke): number {
  const t = s.travelled / CONFIG.drawing.colorEveryPx
  const i = Math.floor(t)
  const from = Phaser.Display.Color.ValueToColor(ctx.color(s.seed + i))
  const to = Phaser.Display.Color.ValueToColor(ctx.color(s.seed + i + 1))
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, (t - i) * 100)
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b)
}

function dab(ctx: ToyContext, s: Stroke, x: number, y: number, batched: boolean): void {
  const scale = brushPx(ctx.width, ctx.height) / BRUSH_TEXTURE_PX
  canvas?.stamp(BRUSH, undefined, x, y, { scale, tint: strokeColor(ctx, s), skipBatch: batched })
}

function begin(ctx: ToyContext, pointerId: number, x: number, y: number): Stroke {
  const s: Stroke = { x, y, travelled: 0, sinceNote: 0, seed: strokeCount++ }
  strokes.set(pointerId, s)
  dab(ctx, s, x, y, false)
  ctx.synth.play(noteForY(y, ctx.height))
  return s
}

function extend(ctx: ToyContext, s: Stroke, x: number, y: number): void {
  if (!canvas) return
  const step = Math.max(2, brushPx(ctx.width, ctx.height) * CONFIG.drawing.spacingFrac)
  const points = strokePoints(s, { x, y }, step)
  if (points.length === 0) return

  const dist = Math.hypot(x - s.x, y - s.y)
  canvas.beginDraw()
  for (const p of points) {
    s.travelled += dist / points.length
    dab(ctx, s, p.x, p.y, true)
  }
  canvas.endDraw()

  s.x = x
  s.y = y
  s.sinceNote += dist
  if (s.sinceNote >= CONFIG.drawing.noteEveryPx) {
    s.sinceNote = 0
    ctx.synth.play(noteForY(y, ctx.height))
  }
}

/** A key press: a sticker pops in, then is painted onto the drawing. */
function sticker(e: SmashEvent, ctx: ToyContext): void {
  const color = ctx.color(e.index)
  const size = brushPx(ctx.width, ctx.height) * CONFIG.drawing.stickerSize
  const angle = ctx.rng.between(-20, 20)
  ctx.synth.play(e.index)

  if (e.char) {
    const txt = ctx.text.spawn(e.char, e.x, e.y, Math.round(size))
    txt.setColor('#' + color.toString(16).padStart(6, '0'))
    txt.setAngle(angle)
    txt.setScale(0.2)
    ctx.scene.tweens.add({
      targets: txt,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        canvas?.draw(txt, txt.x, txt.y)
        ctx.text.retire(txt, 0, 1)
      },
    })
    return
  }

  const img = ctx.pool.spawn(SHAPE_KEYS[ctx.rng.between(0, SHAPE_KEYS.length - 1)], e.x, e.y)
  img.setTint(color)
  img.setAngle(angle)
  img.setScale(0)
  ctx.scene.tweens.add({
    targets: img,
    scale: size / 128,
    duration: 260,
    ease: 'Back.easeOut',
    onComplete: () => {
      canvas?.draw(img, img.x, img.y)
      ctx.pool.retire(img, 0, 1)
    },
  })
}

const brush: Toy = {
  name: 'brush',
  match: () => true,
  play(e, ctx) {
    if (e.source === 'pointer') begin(ctx, e.pointerId ?? -1, e.x, e.y)
    else sticker(e, ctx)
  },
}

function stroke(e: StrokeEvent, ctx: ToyContext): void {
  if (e.phase === 'end') {
    strokes.delete(e.pointerId)
    return
  }
  const s = strokes.get(e.pointerId)
  if (s) extend(ctx, s, e.x, e.y)
  else begin(ctx, e.pointerId, e.x, e.y)
}

function enter(ctx: ToyContext): () => void {
  const { width, height } = ctx
  const rt = ctx.scene.add.renderTexture(0, 0, width, height).setOrigin(0).setDepth(-200)
  canvas = rt

  const fade = ctx.scene.time.addEvent({
    delay: CONFIG.drawing.fadeEveryMs,
    loop: true,
    callback: () =>
      rt.stamp('pixel', undefined, 0, 0, {
        originX: 0,
        originY: 0,
        scaleX: width / 4,
        scaleY: height / 4,
        alpha: CONFIG.drawing.fadeAlpha,
        erase: true,
      }),
  })

  return () => {
    fade.remove()
    strokes.clear()
    if (canvas === rt) canvas = undefined
    rt.destroy()
  }
}

export const drawing: Mode = {
  name: 'drawing',
  label: 'Drawing',
  icon: 'iconCrayon',
  toys: [brush],
  enter,
  stroke,
}
