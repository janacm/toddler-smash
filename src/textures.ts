import Phaser from 'phaser'
import { createAnimalTextures } from './animalTextures'

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
