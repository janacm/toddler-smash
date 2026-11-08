import { CONFIG } from '../config'

/** Brush width in pixels for a screen. */
export function brushPx(width: number, height: number, drawing = CONFIG.drawing): number {
  return Math.max(drawing.minBrushPx, Math.min(width, height) * drawing.brushFrac)
}

/**
 * Points to stamp along a segment, excluding the start (already stamped) and
 * including the end. Spaced at most `step` apart so fast swipes stay solid
 * lines, and capped so one huge jump can't stall a frame.
 */
export function strokePoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  step: number,
  max = 400,
): { x: number; y: number }[] {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  if (!Number.isFinite(dist) || dist === 0 || !(step > 0)) return []
  const n = Math.min(Math.ceil(dist / step), max)
  const points = []
  for (let i = 1; i <= n; i++) {
    const t = i / n
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })
  }
  return points
}

/** Note index for a height on screen: higher up plays higher. */
export function noteForY(y: number, height: number, audio = CONFIG.audio): number {
  const notes = audio.scaleSemitones.length * audio.octaves
  const frac = height > 0 ? Math.min(1, Math.max(0, 1 - y / height)) : 0
  return Math.round(frac * (notes - 1)) || 0
}

export interface CardRect {
  x: number
  y: number
  width: number
  height: number
}

/** Card placement and size centered in available canvas area. */
export function cardRect(viewWidth: number, viewHeight: number, bottomInset = 0): CardRect {
  const availableHeight = Math.max(100, viewHeight - bottomInset)
  const maxW = Math.min(viewWidth * 0.85, 520)
  const maxH = Math.min(availableHeight * 0.65, 380)
  const aspect = 520 / 380

  let w = maxW
  let h = w / aspect
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }

  const cx = viewWidth / 2
  const cy = availableHeight / 2
  return {
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    width: Math.round(w),
    height: Math.round(h),
  }
}

/** Scratch eraser radius derived from brush thickness. */
export function scratchRadiusPx(brushWidthPx: number): number {
  return Math.max(16, brushWidthPx * 1.5)
}

