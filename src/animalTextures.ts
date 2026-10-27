import type Phaser from 'phaser'

type Point = { x: number; y: number }
type Curve = readonly [number, number, number, number, number, number]
type AnimalPalette = {
  outline: number
  skin: number
  shade: number
  belly: number
  accent: number
  cheek: number
}

const DAY_DINO: AnimalPalette = {
  outline: 0x224b44, skin: 0x71c86a, shade: 0x469c68,
  belly: 0xc5e998, accent: 0x398a66, cheek: 0xf3a188,
}
const NIGHT_DINO: AnimalPalette = {
  outline: 0x455d64, skin: 0x9bbcab, shade: 0x7b9c94,
  belly: 0xcbd8b6, accent: 0x708f89, cheek: 0xc9aaa7,
}
const DAY_SHARK: AnimalPalette = {
  outline: 0x28566b, skin: 0x73bbd7, shade: 0x4b93b5,
  belly: 0xe0f4ef, accent: 0x3c7f9c, cheek: 0xefacaa,
}
const NIGHT_SHARK: AnimalPalette = {
  outline: 0x465d72, skin: 0x96b2c7, shade: 0x7c98b3,
  belly: 0xd0dce1, accent: 0x71889f, cheek: 0xc6b2bf,
}

/** Full-colour friends, baked once like the ordinary tintable shape textures. */
export function createAnimalTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false)
  for (const [suffix, dinosaur, shark] of [
    ['', DAY_DINO, DAY_SHARK],
    ['-night', NIGHT_DINO, NIGHT_SHARK],
  ] as const) {
    for (const excited of [false, true]) {
      g.clear()
      drawDinosaur(g, dinosaur, excited)
      g.generateTexture(`dinosaur${excited ? '-roar' : ''}${suffix}`, 256, 256)
      g.clear()
      drawShark(g, shark, excited)
      g.generateTexture(`shark${excited ? '-grin' : ''}${suffix}`, 256, 256)
    }
  }

  // Small companion effects stay white so the toy can use the mood palette.
  g.clear()
  g.fillStyle(0xffffff)
  g.fillEllipse(32, 40, 27, 30)
  g.fillEllipse(15, 20, 13, 21)
  g.fillEllipse(32, 13, 13, 23)
  g.fillEllipse(49, 20, 13, 21)
  g.generateTexture('footprint', 64, 64)

  g.clear()
  g.lineStyle(3, 0xffffff, 0.8)
  g.strokeCircle(24, 24, 17)
  g.lineStyle(4, 0xffffff, 0.85)
  g.beginPath()
  g.arc(24, 24, 11, Math.PI * 1.08, Math.PI * 1.44)
  g.strokePath()
  g.generateTexture('bubble', 48, 48)
  g.destroy()
}

function drawDinosaur(g: Phaser.GameObjects.Graphics, p: AnimalPalette, roar: boolean): void {
  // The rear foot and long, tapered tail make the silhouette read at phone size.
  shape(g, p.shade, p.outline, curve(119, 166, [
    [118, 186, 114, 197, 117, 211], [121, 217, 151, 217, 154, 210],
    [154, 202, 141, 203, 139, 198], [142, 185, 148, 177, 146, 168],
    [138, 160, 127, 160, 119, 166],
  ]))
  shape(g, p.skin, p.outline, curve(115, 144, [
    [84, 147, 53, 143, 23, 115], [33, 151, 56, 178, 95, 180],
    [117, 181, 130, 161, 115, 144],
  ]))
  shape(g, p.skin, p.outline, curve(103, 119, [
    [124, 102, 151, 106, 165, 130], [183, 161, 169, 190, 143, 193],
    [109, 198, 88, 181, 88, 157], [87, 141, 93, 129, 103, 119],
  ]))
  g.fillStyle(p.belly)
  g.fillEllipse(145, 158, 41, 55)

  // A broad snout, a tiny arm and rounded feet keep the T. rex playful.
  shape(g, p.skin, p.outline, curve(133, 126, [
    [145, 110, 142, 80, 151, 61], [162, 39, 204, 36, 221, 54],
    [234, 66, 236, 87, 225, 100], [214, 113, 190, 111, 175, 108],
    [172, 118, 176, 131, 165, 143], [154, 145, 143, 138, 133, 126],
  ]))
  g.fillStyle(p.accent, 0.5)
  g.fillEllipse(101, 151, 10, 15)
  g.fillEllipse(111, 132, 8, 11)
  g.fillEllipse(79, 159, 9, 7)
  g.fillEllipse(61, 151, 7, 6)

  shape(g, p.skin, p.outline, curve(105, 174, [
    [100, 188, 99, 204, 104, 217], [110, 224, 147, 225, 151, 218],
    [155, 208, 136, 210, 130, 205], [131, 195, 135, 189, 133, 182],
    [129, 174, 115, 169, 105, 174],
  ]))
  line(g, p.outline, 3, [{ x: 133, y: 213 }, { x: 133, y: 220 }])
  line(g, p.outline, 3, [{ x: 143, y: 214 }, { x: 143, y: 219 }])
  line(g, p.outline, 12, curve(158, 134, [[168, 142, 176, 149, 184, 144]]))
  line(g, p.skin, 7, curve(158, 133, [[169, 141, 176, 146, 183, 143]]))
  line(g, p.outline, 2.5, [{ x: 182, y: 143 }, { x: 184, y: 148 }])

  g.fillStyle(0xffffff)
  g.fillEllipse(189, 70, 19, 24)
  g.fillStyle(p.outline)
  g.fillEllipse(193, 72, 9, 14)
  g.fillStyle(0xffffff)
  g.fillCircle(195, 68, 2.5)
  g.fillStyle(p.outline, 0.75)
  g.fillEllipse(221, 76, 4.5, 6)
  g.fillStyle(p.cheek, 0.8)
  g.fillEllipse(178, 88, 14, 8)
  if (roar) {
    shape(g, p.outline, p.outline, curve(195, 91, [
      [202, 90, 215, 87, 221, 87], [222, 100, 213, 108, 203, 105],
      [197, 103, 194, 98, 195, 91],
    ]), 2)
    g.fillStyle(p.cheek)
    g.fillEllipse(207, 102, 15, 6)
    g.fillStyle(p.belly)
    g.fillTriangle(201, 91, 207, 90, 205, 96)
    g.fillTriangle(214, 89, 220, 88, 218, 94)
  } else {
    line(g, p.outline, 3, curve(194, 91, [[202, 99, 215, 98, 222, 90]]))
  }
}

function drawShark(g: Phaser.GameObjects.Graphics, p: AnimalPalette, grin: boolean): void {
  // Dorsal and forked tail fins are deliberately broad rather than sharp.
  shape(g, p.shade, p.outline, curve(111, 105, [
    [113, 85, 120, 63, 132, 49], [139, 65, 150, 80, 169, 99],
    [152, 107, 131, 111, 111, 105],
  ]))
  shape(g, p.skin, p.outline, curve(79, 116, [
    [60, 112, 45, 92, 26, 78], [24, 104, 33, 121, 46, 134],
    [32, 148, 25, 168, 27, 186], [46, 175, 64, 154, 80, 151],
    [89, 141, 88, 125, 79, 116],
  ]))
  shape(g, p.skin, p.outline, curve(64, 129, [
    [81, 101, 119, 89, 163, 96], [199, 102, 222, 117, 236, 134],
    [225, 159, 196, 176, 158, 178], [116, 182, 82, 164, 64, 141],
    [61, 137, 61, 133, 64, 129],
  ]))
  // The pale underside follows the body without a second hard outline.
  g.fillStyle(p.belly)
  g.fillPoints(curve(82, 143, [
    [119, 157, 182, 159, 233, 135], [220, 158, 193, 172, 158, 174],
    [125, 177, 97, 161, 82, 143],
  ]), true)
  shape(g, p.shade, p.outline, curve(125, 143, [
    [134, 154, 145, 166, 161, 186], [137, 186, 119, 172, 114, 156],
    [114, 150, 119, 145, 125, 143],
  ]), 4)
  line(g, p.accent, 2.5, curve(151, 121, [[146, 128, 146, 134, 149, 139]]))
  line(g, p.accent, 2.5, curve(160, 124, [[156, 130, 156, 136, 159, 140]]))
  g.fillStyle(0xffffff)
  g.fillEllipse(193, 121, 22, 25)
  g.fillStyle(p.outline)
  g.fillEllipse(197, 122, 11, 16)
  g.fillStyle(0xffffff)
  g.fillCircle(199, 117, 3)
  g.fillStyle(p.cheek, 0.8)
  g.fillEllipse(181, 141, 15, 7)
  if (grin) {
    shape(g, p.outline, p.outline, curve(193, 144, [
      [204, 145, 216, 142, 225, 137], [218, 154, 203, 161, 193, 144],
    ]), 2)
    g.fillStyle(0xffffff)
    g.fillPoints(curve(196, 145, [
      [205, 146, 213, 144, 221, 140], [216, 148, 207, 152, 196, 145],
    ]), true)
    g.fillStyle(p.cheek)
    g.fillEllipse(210, 152, 9, 3)
  } else {
    line(g, p.outline, 3, curve(197, 146, [[207, 152, 218, 147, 224, 140]]))
  }
}

/** Sample cubic curves into the same Graphics polygons used by the other toys. */
function curve(x: number, y: number, segments: readonly Curve[]): Point[] {
  const points: Point[] = [{ x, y }]
  for (const [cx1, cy1, cx2, cy2, endX, endY] of segments) {
    const startX = x
    const startY = y
    for (let step = 1; step <= 10; step++) {
      const t = step / 10
      const n = 1 - t
      points.push({
        x: n ** 3 * startX + 3 * n ** 2 * t * cx1 + 3 * n * t ** 2 * cx2 + t ** 3 * endX,
        y: n ** 3 * startY + 3 * n ** 2 * t * cy1 + 3 * n * t ** 2 * cy2 + t ** 3 * endY,
      })
    }
    x = endX
    y = endY
  }
  return points
}

function shape(
  g: Phaser.GameObjects.Graphics, fill: number, outline: number, points: Point[], width = 4.5,
): void {
  g.fillStyle(fill)
  g.fillPoints(points, true)
  g.lineStyle(width, outline, 1)
  g.strokePoints(points, true, true)
}

function line(g: Phaser.GameObjects.Graphics, colour: number, width: number, points: Point[]): void {
  g.lineStyle(width, colour, 1)
  g.strokePoints(points, false, false)
  g.fillStyle(colour)
  for (const end of [points[0], points[points.length - 1]]) g.fillCircle(end.x, end.y, width / 2)
}
