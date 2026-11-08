import Phaser from 'phaser'
import { createAnimalTextures } from './animalTextures'
import { buildIllustrations } from './discovery/illustrations'

/**
 * All artwork is drawn at runtime with Phaser's Graphics API and baked into
 * textures once at boot. No image files anywhere in the repo.
 *
 * That is a deliberate harness choice: an agent can change what the game looks
 * like by editing drawing code it can actually read, instead of needing to
 * source or generate binary assets it cannot inspect.
 *
 * Shapes are drawn in white so they can be tinted to any palette colour.
 */

export const SHAPE_KEYS = ['circle', 'square', 'triangle', 'star', 'heart', 'ring'] as const
export type ShapeKey = (typeof SHAPE_KEYS)[number]

const SIZE = 128

export function buildTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  const c = SIZE / 2

  const reset = () => {
    g.clear()
    g.fillStyle(0xffffff, 1)
    g.lineStyle(0, 0xffffff, 0)
  }

  reset()
  g.fillCircle(c, c, c - 4)
  g.generateTexture('circle', SIZE, SIZE)

  reset()
  g.fillRoundedRect(6, 6, SIZE - 12, SIZE - 12, 16)
  g.generateTexture('square', SIZE, SIZE)

  reset()
  g.fillTriangle(c, 8, SIZE - 8, SIZE - 12, 8, SIZE - 12)
  g.generateTexture('triangle', SIZE, SIZE)

  reset()
  drawStar(g, c, c, 5, c - 6, (c - 6) * 0.46)
  g.generateTexture('star', SIZE, SIZE)

  reset()
  drawHeart(g, c, c, c - 8)
  g.generateTexture('heart', SIZE, SIZE)

  reset()
  g.lineStyle(14, 0xffffff, 1)
  g.strokeCircle(c, c, c - 12)
  g.generateTexture('ring', SIZE, SIZE)

  // A soft 1x1-scalable dot used for confetti and sparkles.
  reset()
  g.fillCircle(8, 8, 7)
  g.generateTexture('dot', 16, 16)

  // An eighth note: head, stem, flag.
  reset()
  g.fillEllipse(46, 98, 54, 40)
  g.fillRect(62, 16, 11, 84)
  g.fillTriangle(73, 16, 106, 50, 73, 58)
  g.generateTexture('note', SIZE, SIZE)

  // One piano key, stretched to size with setDisplaySize.
  reset()
  g.fillRoundedRect(0, 0, 96, 256, 22)
  g.generateTexture('pianoKey', 96, 256)

  // Soft thought bubble for pictorial requests
  reset()
  g.fillStyle(0xffffff, 0.96)
  g.fillCircle(38, 50, 26)
  g.fillCircle(64, 38, 30)
  g.fillCircle(90, 50, 26)
  g.fillCircle(50, 62, 24)
  g.fillCircle(78, 62, 24)
  g.lineStyle(3, 0xccd9ed, 0.7)
  g.strokeCircle(38, 50, 26)
  g.strokeCircle(64, 38, 30)
  g.strokeCircle(90, 50, 26)
  g.strokeCircle(50, 62, 24)
  g.strokeCircle(78, 62, 24)
  g.generateTexture('thoughtBubble', 128, 96)

  // Trailing dot for thought bubble trail
  reset()
  g.fillCircle(16, 16, 14)
  g.generateTexture('thoughtDot', 32, 32)

  // Four little keys: the picture on the child's piano button.
  reset()
  for (let i = 0; i < 4; i++) g.fillRoundedRect(14 + i * 26, 24, 22, 80, 6)
  g.generateTexture('iconPiano', SIZE, SIZE)

  // A crayon, tip down-left: the picture on the child's drawing button.
  reset()
  const tilt = Math.PI / 4
  const crayon = [
    [-16, -52],
    [16, -52],
    [16, 20],
    [0, 52],
    [-16, 20],
  ].map(([px, py]) => new Phaser.Math.Vector2(c + px * Math.cos(tilt) - py * Math.sin(tilt), c + px * Math.sin(tilt) + py * Math.cos(tilt)))
  g.fillPoints(crayon, true)
  g.generateTexture('iconCrayon', SIZE, SIZE)

  // Plain white, stretched over the whole drawing to fade it.
  reset()
  g.fillRect(0, 0, 4, 4)
  g.generateTexture('pixel', 4, 4)

  // Badge stamp rim: golden outer ring with dark backing plate
  reset()
  g.fillStyle(0xf59e0b, 1)
  g.fillCircle(c, c, c - 4)
  g.lineStyle(6, 0xfde68a, 1)
  g.strokeCircle(c, c, c - 8)
  g.fillStyle(0x1e293b, 0.88)
  g.fillCircle(c, c, c - 15)
  g.generateTexture('badge-rim', SIZE, SIZE)

  // Badge locked slot: soft translucent disc with dashed ring and star
  reset()
  g.fillStyle(0xffffff, 0.12)
  g.fillCircle(c, c, c - 6)
  g.lineStyle(4, 0xffffff, 0.3)
  g.strokeCircle(c, c, c - 6)
  g.fillStyle(0xffffff, 0.28)
  drawStar(g, c, c, 5, 18, 8)
  g.generateTexture('badge-slot', SIZE, SIZE)

  // Badge icons
  reset()
  const arcColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6]
  for (let i = 0; i < 4; i++) {
    g.lineStyle(8, arcColors[i], 1)
    g.beginPath()
    g.arc(c, c + 22, 44 - i * 9, Math.PI, 0)
    g.strokePath()
  }
  g.fillStyle(0xffffff, 1)
  g.fillCircle(c - 36, c + 22, 14)
  g.fillCircle(c - 24, c + 16, 12)
  g.fillCircle(c + 36, c + 22, 14)
  g.fillCircle(c + 24, c + 16, 12)
  g.generateTexture('badge-icon-rainbow', SIZE, SIZE)

  reset()
  g.fillStyle(0x22c55e, 1)
  g.fillEllipse(c, c, 28, 64)
  for (let i = -2; i <= 2; i++) {
    const ly = c + i * 14
    g.fillEllipse(c - 16, ly, 20, 9)
    g.fillEllipse(c + 16, ly, 20, 9)
  }
  g.fillRect(c - 2.5, c + 24, 5, 24)
  g.generateTexture('badge-icon-leaf', SIZE, SIZE)

  reset()
  g.fillStyle(0x06b6d4, 1)
  g.fillEllipse(c, c + 14, 72, 38)
  g.fillStyle(0x0284c7, 1)
  g.fillCircle(c + 6, c - 6, 24)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(c - 15, c - 16, 13)
  g.fillCircle(c - 3, c - 24, 11)
  g.fillCircle(c + 12, c - 22, 9)
  g.generateTexture('badge-icon-wave', SIZE, SIZE)

  reset()
  g.fillStyle(0xfbbf24, 1)
  g.fillCircle(c - 6, c, 36)
  g.fillStyle(0x1e293b, 1)
  g.fillCircle(c + 10, c - 7, 30)
  g.fillStyle(0xffffff, 1)
  drawStar(g, c + 24, c - 16, 5, 14, 6)
  g.generateTexture('badge-icon-moon', SIZE, SIZE)

  // Luminous cosmic orb for trajectory toy.
  reset()
  g.fillStyle(0xffffff, 0.12)
  g.fillCircle(c, c, 60)
  g.fillStyle(0xffffff, 0.28)
  g.fillCircle(c, c, 44)
  g.fillStyle(0xffffff, 0.65)
  g.fillCircle(c, c, 28)
  g.fillStyle(0xffffff, 1.0)
  g.fillCircle(c, c, 14)
  g.generateTexture('orbGlow', SIZE, SIZE)

  // Celestial 4-blade pinwheel for rotation toy.
  reset()
  for (let k = 0; k < 4; k++) {
    const alpha = (k * Math.PI) / 2
    const vane = [
      new Phaser.Math.Vector2(c + 10 * Math.cos(alpha - 0.2), c + 10 * Math.sin(alpha - 0.2)),
      new Phaser.Math.Vector2(c + 34 * Math.cos(alpha + 0.35), c + 34 * Math.sin(alpha + 0.35)),
      new Phaser.Math.Vector2(c + 52 * Math.cos(alpha), c + 52 * Math.sin(alpha)),
      new Phaser.Math.Vector2(c + 28 * Math.cos(alpha - 0.15), c + 28 * Math.sin(alpha - 0.15)),
    ]
    g.fillStyle(0xffffff, 0.85)
    g.fillPoints(vane, true)
    g.fillStyle(0xffffff, 1.0)
    g.fillCircle(c + 52 * Math.cos(alpha), c + 52 * Math.sin(alpha), 4)
  }
  g.fillStyle(0xffffff, 1.0)
  g.fillCircle(c, c, 12)
  g.generateTexture('pinwheel', SIZE, SIZE)

  // Elastic pill connector for constellation connection toy.
  reset()
  g.fillStyle(0xffffff, 0.4)
  g.fillRoundedRect(0, 0, 64, 16, 8)
  g.fillStyle(0xffffff, 0.95)
  g.fillRoundedRect(4, 4, 56, 8, 4)
  g.generateTexture('elasticSegment', 64, 16)

  g.destroy()
  createAnimalTextures(scene)
  buildIllustrations(scene)
}

function drawStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
): void {
  const step = Math.PI / points
  let angle = -Math.PI / 2
  const pts: Phaser.Types.Math.Vector2Like[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r })
    angle += step
  }
  g.fillPoints(pts as Phaser.Geom.Point[], true)
}

function drawHeart(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  // Two lobes plus a triangle to the point. Cheap, reads clearly at any size.
  g.fillCircle(cx - r * 0.42, cy - r * 0.28, r * 0.46)
  g.fillCircle(cx + r * 0.42, cy - r * 0.28, r * 0.46)
  g.fillTriangle(cx - r * 0.86, cy - r * 0.06, cx + r * 0.86, cy - r * 0.06, cx, cy + r * 0.9)
}
