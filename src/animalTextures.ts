import type Phaser from 'phaser'
import type { AnimalFaceKind } from './modes/pianoChoralLogic'

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

  // Animal faces for piano keys and thought companion targets
  const animals: readonly AnimalFaceKind[] = ['frog', 'kitten', 'bird', 'puppy'] as const
  for (const night of [false, true]) {
    const nightSuffix = night ? '-night' : ''
    for (const singing of [false, true]) {
      const singSuffix = singing ? '-sing' : ''
      for (const kind of animals) {
        g.clear()
        if (kind === 'frog') drawFrogFace(g, night, singing)
        else if (kind === 'kitten') drawKittenFace(g, night, singing)
        else if (kind === 'bird') drawBirdFace(g, night, singing)
        else drawPuppyFace(g, night, singing)
        g.generateTexture(`animalFace-${kind}${singSuffix}${nightSuffix}`, 128, 128)
      }
    }
    g.clear()
    drawCompanionDino(g, night)
    g.generateTexture(`companion-dino${nightSuffix}`, 128, 128)
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

function drawFrogFace(g: Phaser.GameObjects.Graphics, night: boolean, singing: boolean): void {
  const skin = night ? 0x8ab99e : 0x76c86a
  const outline = night ? 0x324d43 : 0x224b33
  const cheek = night ? 0xc79e9f : 0xf7a399
  const inside = night ? 0xc5d6c2 : 0xdef0b6

  // Eye domes
  g.fillStyle(skin)
  g.lineStyle(4, outline)
  g.fillCircle(38, 42, 17)
  g.strokeCircle(38, 42, 17)
  g.fillCircle(90, 42, 17)
  g.strokeCircle(90, 42, 17)

  // Head
  g.fillEllipse(64, 72, 88, 64)
  g.strokeEllipse(64, 72, 88, 64)

  // Eyes
  g.fillStyle(0xffffff)
  g.fillCircle(38, 42, 12)
  g.fillCircle(90, 42, 12)
  g.fillStyle(outline)
  g.fillCircle(40, 42, 6)
  g.fillCircle(88, 42, 6)
  g.fillStyle(0xffffff)
  g.fillCircle(42, 40, 2.5)
  g.fillCircle(90, 40, 2.5)

  // Rosy cheeks
  g.fillStyle(cheek, 0.75)
  g.fillCircle(30, 74, 9)
  g.fillCircle(98, 74, 9)

  // Mouth
  if (singing) {
    g.fillStyle(outline)
    g.fillEllipse(64, 80, 18, 22)
    g.fillStyle(inside)
    g.fillEllipse(64, 84, 12, 10)
  } else {
    g.lineStyle(4, outline)
    g.beginPath()
    g.arc(64, 68, 20, Math.PI * 0.2, Math.PI * 0.8)
    g.strokePath()
  }
}

function drawKittenFace(g: Phaser.GameObjects.Graphics, night: boolean, singing: boolean): void {
  const skin = night ? 0xb89f8c : 0xf9b362
  const outline = night ? 0x423630 : 0x5c3317
  const earInside = night ? 0xd9b3be : 0xffcbd5
  const cheek = night ? 0xc9949c : 0xfca090
  const nose = night ? 0xb06b7d : 0xe0607e

  // Ears
  g.fillStyle(skin)
  g.lineStyle(4, outline)
  g.fillTriangle(24, 52, 32, 18, 56, 38)
  g.strokeTriangle(24, 52, 32, 18, 56, 38)
  g.fillTriangle(104, 52, 96, 18, 72, 38)
  g.strokeTriangle(104, 52, 96, 18, 72, 38)

  // Inner ear
  g.fillStyle(earInside)
  g.fillTriangle(30, 48, 36, 26, 52, 40)
  g.fillTriangle(98, 48, 92, 26, 76, 40)

  // Head
  g.fillStyle(skin)
  g.fillEllipse(64, 70, 84, 66)
  g.strokeEllipse(64, 70, 84, 66)

  // Eyes
  g.fillStyle(0xffffff)
  g.fillEllipse(46, 62, 16, 20)
  g.fillEllipse(82, 62, 16, 20)
  g.fillStyle(outline)
  g.fillEllipse(46, 63, 8, 14)
  g.fillEllipse(82, 63, 8, 14)
  g.fillStyle(0xffffff)
  g.fillCircle(48, 60, 2.5)
  g.fillCircle(84, 60, 2.5)

  // Whiskers
  g.lineStyle(2.5, outline, 0.7)
  g.lineBetween(32, 72, 14, 70)
  g.lineBetween(32, 77, 16, 81)
  g.lineBetween(96, 72, 114, 70)
  g.lineBetween(96, 77, 112, 81)

  // Cheeks & nose
  g.fillStyle(cheek, 0.7)
  g.fillCircle(33, 73, 8)
  g.fillCircle(95, 73, 8)
  g.fillStyle(nose)
  g.fillTriangle(60, 72, 68, 72, 64, 76)

  // Mouth
  if (singing) {
    g.fillStyle(outline)
    g.fillEllipse(64, 82, 16, 18)
    g.fillStyle(cheek)
    g.fillEllipse(64, 85, 10, 8)
  } else {
    g.lineStyle(3, outline)
    g.beginPath()
    g.arc(58, 78, 7, 0, Math.PI * 0.85)
    g.strokePath()
    g.beginPath()
    g.arc(70, 78, 7, Math.PI * 0.15, Math.PI)
    g.strokePath()
  }
}

function drawBirdFace(g: Phaser.GameObjects.Graphics, night: boolean, singing: boolean): void {
  const skin = night ? 0x7da8bd : 0x5bbce4
  const outline = night ? 0x2c4350 : 0x1e4f68
  const beakColor = night ? 0xd4a04d : 0xfcb034
  const cheek = night ? 0xba8a91 : 0xf9a399
  const crestColor = night ? 0xc9b27d : 0xffd15c

  // Crest
  g.fillStyle(crestColor)
  g.lineStyle(3, outline)
  g.fillTriangle(58, 36, 64, 18, 70, 36)
  g.strokeTriangle(58, 36, 64, 18, 70, 36)
  g.fillTriangle(66, 38, 74, 24, 78, 40)
  g.strokeTriangle(66, 38, 74, 24, 78, 40)

  // Head
  g.fillStyle(skin)
  g.lineStyle(4, outline)
  g.fillEllipse(64, 68, 78, 74)
  g.strokeEllipse(64, 68, 78, 74)

  // Eyes
  g.fillStyle(0xffffff)
  g.fillCircle(44, 60, 13)
  g.fillCircle(84, 60, 13)
  g.fillStyle(outline)
  g.fillCircle(46, 60, 7)
  g.fillCircle(82, 60, 7)
  g.fillStyle(0xffffff)
  g.fillCircle(48, 58, 3)
  g.fillCircle(84, 58, 3)

  // Cheeks
  g.fillStyle(cheek, 0.7)
  g.fillCircle(32, 72, 8)
  g.fillCircle(96, 72, 8)

  // Beak
  g.fillStyle(beakColor)
  g.lineStyle(3, outline)
  if (singing) {
    g.fillTriangle(54, 70, 74, 70, 64, 62)
    g.strokeTriangle(54, 70, 74, 70, 64, 62)
    g.fillStyle(outline)
    g.fillEllipse(64, 75, 14, 12)
    g.fillStyle(beakColor)
    g.fillTriangle(56, 78, 72, 78, 64, 86)
    g.strokeTriangle(56, 78, 72, 78, 64, 86)
  } else {
    g.fillTriangle(54, 68, 74, 68, 64, 80)
    g.strokeTriangle(54, 68, 74, 68, 64, 80)
  }
}

function drawPuppyFace(g: Phaser.GameObjects.Graphics, night: boolean, singing: boolean): void {
  const skin = night ? 0xaa9481 : 0xdba679
  const ears = night ? 0x7a6352 : 0xa0673d
  const outline = night ? 0x382c24 : 0x482b18
  const snout = night ? 0xcfc1b2 : 0xf5ddc6
  const nose = night ? 0x281e18 : 0x3a2215
  const cheek = night ? 0xb8888b : 0xf79999

  // Floppy ears
  g.fillStyle(ears)
  g.lineStyle(4, outline)
  g.fillEllipse(26, 64, 26, 52)
  g.strokeEllipse(26, 64, 26, 52)
  g.fillEllipse(102, 64, 26, 52)
  g.strokeEllipse(102, 64, 26, 52)

  // Head
  g.fillStyle(skin)
  g.fillEllipse(64, 68, 80, 72)
  g.strokeEllipse(64, 68, 80, 72)

  // Eyes
  g.fillStyle(0xffffff)
  g.fillCircle(46, 56, 11)
  g.fillCircle(82, 56, 11)
  g.fillStyle(outline)
  g.fillCircle(47, 56, 6)
  g.fillCircle(81, 56, 6)
  g.fillStyle(0xffffff)
  g.fillCircle(49, 54, 2.5)
  g.fillCircle(83, 54, 2.5)

  // Snout
  g.fillStyle(snout)
  g.lineStyle(3, outline)
  g.fillEllipse(64, 78, 44, 32)
  g.strokeEllipse(64, 78, 44, 32)

  // Nose
  g.fillStyle(nose)
  g.fillEllipse(64, 72, 16, 11)

  // Cheeks
  g.fillStyle(cheek, 0.65)
  g.fillCircle(36, 75, 7)
  g.fillCircle(92, 75, 7)

  // Mouth / tongue
  if (singing) {
    g.fillStyle(outline)
    g.fillEllipse(64, 84, 15, 18)
    g.fillStyle(cheek)
    g.fillEllipse(64, 88, 10, 9)
  } else {
    g.lineStyle(2.5, outline)
    g.lineBetween(64, 77, 64, 83)
    g.beginPath()
    g.arc(58, 83, 6, 0, Math.PI * 0.9)
    g.strokePath()
    g.beginPath()
    g.arc(70, 83, 6, Math.PI * 0.1, Math.PI)
    g.strokePath()
  }
}

function drawCompanionDino(g: Phaser.GameObjects.Graphics, night: boolean): void {
  const p = night ? NIGHT_DINO : DAY_DINO

  // Spikes on back
  g.fillStyle(p.accent)
  g.fillTriangle(38, 38, 30, 46, 42, 50)
  g.fillTriangle(34, 54, 26, 62, 38, 66)
  g.fillTriangle(32, 70, 24, 78, 36, 82)

  // Tail
  g.fillStyle(p.skin)
  g.lineStyle(4, p.outline)
  g.beginPath()
  g.arc(38, 88, 22, Math.PI * 0.6, Math.PI * 1.3)
  g.strokePath()

  // Body
  g.fillStyle(p.skin)
  g.fillEllipse(64, 82, 58, 52)
  g.strokeEllipse(64, 82, 58, 52)

  // Pale belly
  g.fillStyle(p.belly)
  g.fillEllipse(66, 84, 38, 38)

  // Feet
  g.fillStyle(p.skin)
  g.fillEllipse(48, 104, 22, 14)
  g.strokeEllipse(48, 104, 22, 14)
  g.fillEllipse(80, 104, 22, 14)
  g.strokeEllipse(80, 104, 22, 14)

  // Head
  g.fillStyle(p.skin)
  g.fillEllipse(66, 44, 54, 46)
  g.strokeEllipse(66, 44, 54, 46)

  // Eye
  g.fillStyle(0xffffff)
  g.fillCircle(72, 40, 14)
  g.fillStyle(p.outline)
  g.fillCircle(75, 41, 7)
  g.fillStyle(0xffffff)
  g.fillCircle(77, 38, 3)

  // Snout / nostril
  g.fillStyle(p.outline, 0.7)
  g.fillCircle(87, 46, 2)

  // Blushing cheek
  g.fillStyle(p.cheek, 0.75)
  g.fillEllipse(60, 52, 12, 7)

  // Smiling mouth
  g.lineStyle(3, p.outline)
  g.beginPath()
  g.arc(72, 48, 12, Math.PI * 0.1, Math.PI * 0.65)
  g.strokePath()
}
