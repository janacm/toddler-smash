/// <reference types="vite/client" />
import type Phaser from 'phaser'

import { SCENE_CARD_IDS, type SceneCardId } from './types'

type Prop = [art: string, x: number, y: number, size: number]
type SceneArt = {
  sky: [string, string]
  terrain: [color: string, path: string][]
  props: Prop[]
  hero: [x: number, y: number, size: number]
}

const scenes: Record<SceneCardId, SceneArt> = {
  fox: {
    sky: ['#fccb7b', '#fff1b2'],
    terrain: [
      ['#97b87a', 'M0 231 Q120 158 263 248 T520 214 V380 H0Z'],
      ['#527e59', 'M0 303 Q153 247 287 310 T520 281 V380 H0Z'],
      ['#36694e', 'M0 342 Q120 319 226 359 T520 322 V380 H0Z'],
    ],
    props: [['evergreen', 80, 187, 135], ['evergreen', 441, 168, 180], ['mushroom', 408, 315, 82]],
    hero: [252, 219, 250],
  },
  rocket: {
    sky: ['#192461', '#694284'],
    terrain: [
      ['#aba2e8', 'M0 327 Q90 264 204 322 Q356 395 520 298 V380 H0Z'],
      ['#d5ccfb', 'M0 350 Q120 313 259 357 T520 343 V380 H0Z'],
    ],
    props: [['planet', 105, 104, 146], ['stars', 422, 117, 73], ['stars', 112, 247, 46]],
    hero: [307, 190, 247],
  },
  octopus: {
    sky: ['#2dadc7', '#075486'],
    terrain: [
      ['#94dadd', 'M0 43 Q111 86 231 37 T520 46 V0 H0Z'],
      ['#0e7692', 'M0 306 Q170 244 287 309 T520 287 V380 H0Z'],
      ['#efba91', 'M0 354 Q130 300 290 349 T520 333 V380 H0Z'],
    ],
    props: [['fish', 92, 153, 88], ['fish', 409, 95, 61], ['fish', 443, 233, 75]],
    hero: [260, 220, 244],
  },
  unicorn: {
    sky: ['#9fc7ff', '#fbe4ff'],
    terrain: [
      ['#d0b1f2', 'M0 230 Q132 166 267 237 T520 209 V380 H0Z'],
      ['#f0acdc', 'M0 282 Q155 319 283 273 T520 287 V380 H0Z'],
      ['#f8cbe9', 'M0 339 Q168 283 316 333 T520 311 V380 H0Z'],
    ],
    props: [['rainbow', 118, 111, 190], ['stars', 441, 106, 70], ['flower', 102, 310, 66]],
    hero: [312, 216, 246],
  },
  penguin: {
    sky: ['#718cdb', '#b3ecf7'],
    terrain: [
      ['#d6effb', 'M0 277 L114 94 L193 209 L285 117 L411 267 L520 165 V380 H0Z'],
      ['#a0d9f2', 'M0 270 L134 179 L248 260 L363 194 L520 247 V380 H0Z'],
      ['#f0fcff', 'M0 324 Q106 272 242 316 T520 288 V380 H0Z'],
    ],
    props: [['snowflake', 99, 209, 64], ['snowflake', 407, 113, 76], ['snowflake', 431, 252, 48]],
    hero: [259, 211, 248],
  },
  train: {
    sky: ['#8ed8ee', '#fff7c3'],
    terrain: [
      ['#a4cc7c', 'M0 242 Q121 128 271 237 Q420 139 520 218 V380 H0Z'],
      ['#6eaa62', 'M0 293 Q169 238 302 300 T520 267 V380 H0Z'],
      ['#f8da98', 'M0 316 L520 303 V359 L0 372Z'],
      ['#935b4a', 'M0 319 L520 306 V314 L0 327Z M0 352 L520 339 V347 L0 360Z'],
    ],
    props: [['evergreen', 420, 179, 117], ['evergreen', 80, 216, 91]],
    hero: [251, 195, 252],
  },
  butterfly: {
    sky: ['#76d3db', '#f7f9b3'],
    terrain: [
      ['#bbda71', 'M0 249 Q120 192 257 265 T520 229 V380 H0Z'],
      ['#72bd7f', 'M0 298 Q110 253 266 309 T520 283 V380 H0Z'],
      ['#39a17c', 'M0 349 Q155 310 287 352 T520 325 V380 H0Z'],
    ],
    props: [['flower', 74, 274, 92], ['flower', 142, 319, 73], ['flower', 433, 285, 114]],
    hero: [262, 181, 245],
  },
  turtle: {
    sky: ['#61c7ee', '#e4f7ff'],
    terrain: [
      ['#35b7ce', 'M0 153 Q114 178 258 153 T520 163 V380 H0Z'],
      ['#a0eddf', 'M0 268 Q121 221 257 252 T520 235 V380 H0Z'],
      ['#ffe1a2', 'M0 287 Q111 239 258 267 T520 251 V380 H0Z'],
      ['#f0bf7c', 'M0 352 Q115 317 259 345 T520 315 V380 H0Z'],
    ],
    props: [['fish', 414, 201, 67], ['flower', 92, 302, 72]],
    hero: [242, 228, 254],
  },
  robot: {
    sky: ['#362c65', '#c16abb'],
    terrain: [
      ['#7862a6', 'M0 123 H94 V259 H132 V179 H206 V380 H0Z M358 156 H427 V219 H466 V109 H520 V380 H358Z'],
      ['#372459', 'M0 302 H520 V380 H0Z'],
      ['#f4a8eb', 'M0 315 H520 V320 H0Z M0 349 H520 V353 H0Z'],
    ],
    props: [['stars', 103, 202, 87], ['stars', 422, 142, 106], ['stars', 421, 294, 58]],
    hero: [261, 201, 238],
  },
  dragon: {
    sky: ['#b499ee', '#ffe4bb'],
    terrain: [
      ['#b195c1', 'M0 228 L105 103 L191 204 L259 153 L345 270 L430 142 L520 211 V380 H0Z'],
      ['#84af9b', 'M0 294 Q120 229 280 298 T520 267 V380 H0Z'],
      ['#569781', 'M0 342 Q140 276 252 342 T520 308 V380 H0Z'],
    ],
    props: [['castle', 115, 205, 148], ['stars', 409, 99, 73], ['evergreen', 441, 302, 91]],
    hero: [316, 222, 257],
  },
}

const sources = import.meta.glob<string>('./art/*.svg', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
})

export function preloadScratchArt(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(sources)) {
    const name = path.slice('./art/'.length, -'.svg'.length)
    scene.load.svg(`scratch-art-${name}`, url, { width: 280, height: 280 })
  }
}

export function buildScratchScenes(scene: Phaser.Scene, width: number, height: number): void {
  for (const id of SCENE_CARD_IDS) {
    const art = scenes[id]
    const texture = scene.textures.createCanvas(`illustration-${id}`, width, height)
    if (!texture) continue
    const ctx = texture.context
    const sky = ctx.createLinearGradient(0, 0, width * 0.25, height)
    sky.addColorStop(0, art.sky[0])
    sky.addColorStop(1, art.sky[1])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, height)

    const glow = ctx.createRadialGradient(260, 165, 10, 260, 165, 234)
    glow.addColorStop(0, '#ffffff8a')
    glow.addColorStop(1, '#ffffff00')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)

    for (const [color, path] of art.terrain) {
      ctx.fillStyle = color
      ctx.fill(new Path2D(path))
    }

    ctx.fillStyle = '#ffffff60'
    for (const [x, y, radius] of [[36, 69, 5], [183, 53, 3], [327, 63, 6], [470, 62, 5],
      [43, 132, 3], [478, 177, 4], [62, 318, 3], [373, 339, 4], [487, 297, 6]]) {
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
    }

    for (const [name, x, y, size] of [...art.props, [id, ...art.hero] as Prop]) {
      const key = `scratch-art-${name}`
      if (!scene.textures.exists(key)) continue
      const image = scene.textures.get(key).getSourceImage()
      if (image instanceof HTMLImageElement) {
        ctx.drawImage(image, x - size / 2, y - size / 2, size, size)
      }
    }
    texture.refresh()
  }

  // The composed cards own their pixels. Discard the individual source textures.
  for (const key of scene.textures.getTextureKeys()) {
    if (key.startsWith('scratch-art-')) scene.textures.remove(key)
  }
}
