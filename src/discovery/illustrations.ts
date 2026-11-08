import Phaser from 'phaser'

export const ILLUSTRATION_WIDTH = 520
export const ILLUSTRATION_HEIGHT = 380

/**
 * Procedural scratch-off illustrations and cover texture.
 * All artwork is generated in code at boot into Phaser textures.
 * Zero image files.
 */
export function buildIllustrations(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)

  buildDinoIllustration(g)
  g.generateTexture('illustration-dino', ILLUSTRATION_WIDTH, ILLUSTRATION_HEIGHT)

  g.clear()
  buildSharkIllustration(g)
  g.generateTexture('illustration-shark', ILLUSTRATION_WIDTH, ILLUSTRATION_HEIGHT)

  g.clear()
  buildSkyIllustration(g)
  g.generateTexture('illustration-sky', ILLUSTRATION_WIDTH, ILLUSTRATION_HEIGHT)

  g.clear()
  buildScratchCover(g)
  g.generateTexture('scratch-cover', ILLUSTRATION_WIDTH, ILLUSTRATION_HEIGHT)

  g.destroy()
}

function buildDinoIllustration(g: Phaser.GameObjects.Graphics): void {
  const w = ILLUSTRATION_WIDTH
  const h = ILLUSTRATION_HEIGHT

  // Sky
  g.fillStyle(0x9fe1fa, 1)
  g.fillRect(0, 0, w, h)

  // Soft smiling sun
  g.fillStyle(0xfff3b0, 0.4)
  g.fillCircle(440, 70, 56)
  g.fillStyle(0xffd166, 1)
  g.fillCircle(440, 70, 38)
  // Sun smile and eyes
  g.fillStyle(0x8a6d05, 1)
  g.fillCircle(430, 64, 4)
  g.fillCircle(450, 64, 4)
  g.lineStyle(3, 0x8a6d05, 1)
  g.beginPath()
  g.arc(440, 72, 10, 0.2, Math.PI - 0.2)
  g.strokePath()

  // Puffy clouds
  drawCloud(g, 90, 80, 42)
  drawCloud(g, 270, 65, 34)

  // Distant rolling hills
  g.fillStyle(0x66bb6a, 1)
  g.fillEllipse(180, 360, 480, 220)
  g.fillStyle(0x43a047, 1)
  g.fillEllipse(380, 370, 500, 210)

  // Foreground grassy glade
  g.fillStyle(0x2e7d32, 1)
  g.fillRect(0, 280, w, 100)

  // Primitive fern / palm fronds on left
  g.fillStyle(0x1b5e20, 1)
  for (let i = 0; i < 5; i++) {
    const angle = -0.8 + i * 0.35
    const fx = 40 + Math.cos(angle) * 70
    const fy = 290 + Math.sin(angle) * 70
    g.fillEllipse(fx, fy, 45, 18)
  }

  // Friendly cartoon dinosaur (center-right)
  const dx = 280
  const dy = 230

  // Tail
  g.fillStyle(0x5ca955, 1)
  g.fillEllipse(dx - 90, dy + 20, 90, 40)

  // Body
  g.fillStyle(0x71c86a, 1)
  g.fillEllipse(dx, dy, 130, 105)

  // Soft belly
  g.fillStyle(0xc5e998, 1)
  g.fillEllipse(dx + 12, dy + 15, 75, 65)

  // Legs and feet
  g.fillStyle(0x5ca955, 1)
  g.fillRoundedRect(dx - 45, dy + 35, 32, 50, 12)
  g.fillStyle(0x71c86a, 1)
  g.fillRoundedRect(dx + 10, dy + 35, 36, 52, 12)

  // Head and snout
  g.fillStyle(0x71c86a, 1)
  g.fillRoundedRect(dx + 25, dy - 75, 95, 68, 24)

  // Eye
  g.fillStyle(0xffffff, 1)
  g.fillCircle(dx + 70, dy - 52, 16)
  g.fillStyle(0x224b44, 1)
  g.fillCircle(dx + 74, dy - 52, 9)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(dx + 77, dy - 55, 4)

  // Rosy cheek
  g.fillStyle(0xf48fb1, 0.7)
  g.fillCircle(dx + 55, dy - 32, 12)

  // Smile
  g.lineStyle(4, 0x224b44, 1)
  g.beginPath()
  g.arc(dx + 90, dy - 32, 16, 0.2, Math.PI * 0.75)
  g.strokePath()

  // Cute tiny arm
  g.fillStyle(0x5ca955, 1)
  g.fillRoundedRect(dx + 48, dy - 5, 26, 16, 8)

  // Wildflowers on grass
  drawFlower(g, 70, 330, 0xffd166)
  drawFlower(g, 130, 345, 0xf48fb1)
  drawFlower(g, 450, 335, 0xffd166)
  drawFlower(g, 490, 350, 0xf48fb1)
}

function buildSharkIllustration(g: Phaser.GameObjects.Graphics): void {
  const w = ILLUSTRATION_WIDTH
  const h = ILLUSTRATION_HEIGHT

  // Turquoise / deep ocean
  g.fillStyle(0x0077b6, 1)
  g.fillRect(0, 0, w, h)

  // Sunbeams filtering from above
  g.fillStyle(0x90e0ef, 0.15)
  g.fillTriangle(60, 0, 180, 0, 120, h)
  g.fillTriangle(240, 0, 360, 0, 310, h)
  g.fillTriangle(410, 0, 510, 0, 470, h)

  // Sandy seabed
  g.fillStyle(0xee9b00, 1)
  g.fillEllipse(260, 380, 560, 95)
  g.fillStyle(0xca6702, 1)
  g.fillEllipse(390, 395, 300, 70)

  // Colorful coral and seaweed on seafloor
  g.fillStyle(0x9b5de5, 1)
  g.fillRoundedRect(60, 310, 18, 55, 9)
  g.fillRoundedRect(72, 325, 16, 40, 8)
  g.fillStyle(0xf15bb5, 1)
  g.fillRoundedRect(420, 300, 22, 65, 10)
  g.fillRoundedRect(436, 320, 18, 45, 9)
  g.fillStyle(0x00f5d4, 0.8)
  g.fillRoundedRect(140, 305, 14, 60, 7)
  g.fillRoundedRect(350, 315, 14, 50, 7)

  // Friendly grinning reef shark (swimming center)
  const sx = 260
  const sy = 190

  // Tail fin
  g.fillStyle(0x3a86c8, 1)
  g.fillTriangle(sx - 160, sy, sx - 210, sy - 55, sx - 190, sy)
  g.fillTriangle(sx - 160, sy, sx - 205, sy + 50, sx - 190, sy)

  // Dorsal fin
  g.fillTriangle(sx - 20, sy - 25, sx - 5, sy - 85, sx + 35, sy - 25)

  // Pectoral fin
  g.fillTriangle(sx + 10, sy + 15, sx - 25, sy + 65, sx + 45, sy + 15)

  // Shark body
  g.fillStyle(0x48cae4, 1)
  g.fillEllipse(sx, sy, 240, 90)

  // White belly
  g.fillStyle(0xedf6f9, 1)
  g.fillEllipse(sx + 20, sy + 18, 170, 50)

  // Grinning mouth
  g.lineStyle(4, 0x1d3557, 1)
  g.beginPath()
  g.arc(sx + 75, sy + 10, 24, 0.1, Math.PI * 0.7)
  g.strokePath()

  // Eye
  g.fillStyle(0xffffff, 1)
  g.fillCircle(sx + 80, sy - 14, 15)
  g.fillStyle(0x1d3557, 1)
  g.fillCircle(sx + 84, sy - 14, 8)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(sx + 87, sy - 17, 3.5)

  // Rosy cheek
  g.fillStyle(0xefacaa, 0.7)
  g.fillCircle(sx + 60, sy + 4, 11)

  // Floating bubbles
  drawBubble(g, sx - 110, sy - 50, 14)
  drawBubble(g, sx - 135, sy - 85, 20)
  drawBubble(g, sx + 120, sy - 70, 12)
  drawBubble(g, sx + 140, sy - 110, 16)
  drawBubble(g, 80, 120, 18)
}

function buildSkyIllustration(g: Phaser.GameObjects.Graphics): void {
  const w = ILLUSTRATION_WIDTH
  const h = ILLUSTRATION_HEIGHT

  // Night sky
  g.fillStyle(0x0b132b, 1)
  g.fillRect(0, 0, w, h)

  // Soft purple twilight nebula
  g.fillStyle(0x3a0ca3, 0.3)
  g.fillEllipse(260, 180, 480, 240)
  g.fillStyle(0x4361ee, 0.2)
  g.fillEllipse(320, 150, 360, 180)

  // Smiling golden crescent moon
  const mx = 170
  const my = 175
  const mr = 70
  g.fillStyle(0xffd166, 1)
  g.fillCircle(mx, my, mr)
  // Cut out the inner circle to form crescent
  g.fillStyle(0x0b132b, 1)
  g.fillCircle(mx + 32, my - 15, mr * 0.85)

  // Cute closed eye on moon
  g.lineStyle(3, 0x8a6d05, 1)
  g.beginPath()
  g.arc(mx - 15, my - 8, 8, 0.1, Math.PI - 0.1)
  g.strokePath()

  // Rosy cheek on moon
  g.fillStyle(0xf7aef8, 0.6)
  g.fillCircle(mx - 15, my + 14, 10)

  // Night cap on moon tip
  g.fillStyle(0x7209b7, 1)
  g.fillTriangle(mx - 25, my - 65, mx + 20, my - 60, mx - 10, my - 110)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(mx - 10, my - 112, 10)

  // Soft sleepy clouds
  drawCloud(g, 380, 240, 42, 0x5c677d, 0.4)
  drawCloud(g, 120, 280, 36, 0x5c677d, 0.35)

  // Twinkling stars
  const stars: [number, number, number][] = [
    [320, 70, 14],
    [400, 110, 10],
    [450, 60, 16],
    [350, 150, 8],
    [480, 160, 12],
    [260, 90, 7],
    [80, 70, 12],
    [60, 150, 9],
    [220, 310, 8],
    [380, 320, 11],
  ]

  for (const [sx, sy, sr] of stars) {
    drawStar(g, sx, sy, 5, sr, sr * 0.45, 0xfff3b0)
  }
}

function buildScratchCover(g: Phaser.GameObjects.Graphics): void {
  const w = ILLUSTRATION_WIDTH
  const h = ILLUSTRATION_HEIGHT

  // Soft pearlescent champagne / silvery coating
  g.fillStyle(0xdbe2ea, 1)
  g.fillRect(0, 0, w, h)

  // Inner subtle highlight border
  g.lineStyle(6, 0xf1f5f9, 0.8)
  g.strokeRoundedRect(6, 6, w - 12, h - 12, 16)

  // Subtle scattered sparkles across surface beckoning toddler to scratch
  for (let r = 35; r < h; r += 50) {
    for (let c = 35; c < w; c += 50) {
      const jx = c + ((r % 100 === 35 ? 12 : -12))
      const jy = r
      g.fillStyle(0xf59e0b, 0.28)
      drawStar(g, jx, jy, 4, 11, 4, 0xf59e0b, 0.28)
      g.fillStyle(0x94a3b8, 0.22)
      g.fillCircle(jx + 22, jy + 20, 4)
    }
  }
}

function drawCloud(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  color = 0xffffff,
  alpha = 0.9,
): void {
  g.fillStyle(color, alpha)
  g.fillCircle(cx, cy, r)
  g.fillCircle(cx - r * 0.65, cy + r * 0.15, r * 0.7)
  g.fillCircle(cx + r * 0.65, cy + r * 0.15, r * 0.7)
  g.fillRoundedRect(cx - r * 0.9, cy, r * 1.8, r * 0.65, 8)
}

function drawFlower(g: Phaser.GameObjects.Graphics, x: number, y: number, petalColor: number): void {
  g.fillStyle(petalColor, 0.9)
  g.fillCircle(x - 5, y, 4)
  g.fillCircle(x + 5, y, 4)
  g.fillCircle(x, y - 5, 4)
  g.fillCircle(x, y + 5, 4)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(x, y, 3)
}

function drawBubble(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.lineStyle(2, 0xffffff, 0.75)
  g.strokeCircle(x, y, r)
  g.fillStyle(0xffffff, 0.8)
  g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.28)
}

function drawStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  points: number,
  outer: number,
  inner: number,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha)
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
