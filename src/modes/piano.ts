import Phaser from 'phaser'
import { CONFIG } from '../config'
import { EchoQueue } from '../challenges/rewards'
import { currentMood } from '../settings'
import type { Toy, ToyContext } from '../toys/types'
import { keyIndex, pianoKeyCount } from './pianoLayout'
import {
  ChoralPhraseDetector,
  getAnimalForPianoKey,
  type AnimalFaceKind,
} from './pianoChoralLogic'
import { ChoralEchoQueue } from './choralEchoQueue'
import type { Mode } from './types'

/**
 * A rainbow toy piano across the bottom of the screen. The same key always
 * plays the same note and dips the same piano key, so a child can find a note
 * again: the number row 1..0 maps onto the ten keys, letters land on the key
 * under their spot on the keyboard, and a tap plays whichever column it hits.
 *
 * Notes come from the pentatonic table like every other sound, so it behaves
 * like a xylophone: there is no wrong note.
 */

interface PianoKey {
  img: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  face: Phaser.GameObjects.Image
  animal: AnimalFaceKind
  x: number
  top: number
  restY: number
  labelY: number
  faceY: number
}

let keys: PianoKey[] = []
let playground = false
let echoes: EchoQueue | undefined
let phraseDetector: ChoralPhraseDetector | undefined
let choralQueue: ChoralEchoQueue | undefined

function setPlayground(active: boolean): void {
  playground = active
  if (!active) echoes?.cancel()
  if (active) {
    choralQueue?.cancel()
    phraseDetector?.reset()
  }
}

function playChoralEchoStep(
  noteIndex: number,
  harmonyIndex: number,
  animal: AnimalFaceKind,
  gain: number,
  ctx: ToyContext,
): void {
  const key = keys[noteIndex]
  const night = currentMood().night
  const nightSuffix = night ? '-night' : ''

  if (key) {
    ctx.scene.tweens.killTweensOf([key.img, key.label, key.face])
    key.img.y = key.restY
    key.label.y = key.labelY
    key.face.y = key.faceY
    ctx.scene.tweens.add({
      targets: [key.img, key.label, key.face],
      y: '+=12',
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    })
    const singTexture = `animalFace-${animal}-sing${nightSuffix}`
    const normalTexture = `animalFace-${animal}${nightSuffix}`
    key.face.setTexture(singTexture)
    ctx.scene.time.delayedCall(220, () => {
      if (key.face && key.face.active) {
        key.face.setTexture(normalTexture)
      }
    })
  }

  ctx.synth.play(noteIndex, 'choral', gain)
  ctx.synth.play(harmonyIndex, 'choral', gain * 0.8)

  const x = key ? key.x : ctx.width / 2
  const top = key ? key.top : ctx.height * 0.6
  const note = ctx.pool.spawn('note', x, top - 20)
  note.setTint(ctx.color(noteIndex))
  note.setAlpha(gain)
  note.setScale(0.45)
  ctx.scene.tweens.add({
    targets: note,
    x: x + ctx.rng.between(-40, 40),
    y: top - ctx.rng.between(150, 240),
    angle: ctx.rng.between(-20, 20),
    duration: 1200,
    ease: 'Sine.easeOut',
  })
  ctx.pool.retire(note, 800, 400)
}

function buildKeys(ctx: ToyContext): () => void {
  setPlayground(false)
  const entryEchoes = new EchoQueue((index, gain) => playKey(index, ctx, gain), CONFIG.challenges)
  echoes = entryEchoes

  phraseDetector = new ChoralPhraseDetector(CONFIG.choralEcho)
  choralQueue = new ChoralEchoQueue(
    (noteIndex, harmonyIndex, animal, gain) => {
      playChoralEchoStep(noteIndex, harmonyIndex, animal, gain, ctx)
    },
    CONFIG.choralEcho,
  )

  const { heightFrac, gapPx } = CONFIG.piano
  const n = pianoKeyCount(ctx.width)
  // Number labels only mean something when they match the number row.
  const showLabels = n === CONFIG.piano.keys
  const margin = ctx.width * 0.04
  const keyW = (ctx.width - margin * 2 - gapPx * (n - 1)) / n
  const keyH = ctx.height * heightFrac
  const top = ctx.height - keyH - ctx.height * 0.04
  const night = currentMood().night
  const nightSuffix = night ? '-night' : ''

  keys = []
  for (let i = 0; i < n; i++) {
    const x = margin + i * (keyW + gapPx) + keyW / 2
    const restY = top + keyH / 2
    const labelY = top + keyH - Math.min(keyW * 0.45, 44)
    const faceY = top + keyH * 0.38
    const faceSize = Math.min(keyW * 0.52, 44)
    const animal = getAnimalForPianoKey(i)
    const faceTexture = `animalFace-${animal}${nightSuffix}`

    const img = ctx.scene.add.image(x, restY, 'pianoKey').setDisplaySize(keyW, keyH).setTint(ctx.color(i)).setDepth(-100)
    const label = ctx.scene.add
      .text(x, labelY, String((i + 1) % 10), {
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontStyle: 'bold',
        fontSize: `${Math.round(Math.min(keyW * 0.4, 40))}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(-99)
      .setVisible(showLabels)

    const face = ctx.scene.add
      .image(x, faceY, faceTexture)
      .setDisplaySize(faceSize, faceSize)
      .setDepth(-98)

    // Rise into place one after another when the piano appears.
    const drop = keyH * 0.6
    img.y += drop
    label.y += drop
    face.y += drop
    ctx.scene.tweens.add({
      targets: [img, label, face],
      y: `-=${drop}`,
      delay: i * 35,
      duration: 380,
      ease: 'Back.easeOut',
    })

    keys.push({ img, label, face, animal, x, top, restY, labelY, faceY })
  }

  const entryKeys = keys
  return () => {
    setPlayground(false)
    entryEchoes.cancel()
    choralQueue?.cancel()
    phraseDetector?.reset()
    if (echoes === entryEchoes) echoes = undefined
    choralQueue = undefined
    phraseDetector = undefined
    for (const key of entryKeys) {
      ctx.scene.tweens.killTweensOf([key.img, key.label, key.face])
      key.img.destroy()
      key.label.destroy()
      key.face.destroy()
    }
    if (keys === entryKeys) keys = []
  }
}

/** Shared by player notes, puzzle demonstrations and the quiet earned echo. */
function playKey(i: number, ctx: ToyContext, gainScale = 1): void {
  const key = keys[i]
  if (!key) return
  const color = ctx.color(i)

  ctx.synth.play(i, 'piano', gainScale)

  // Dip the key. Resetting first means a mashed key never drifts down.
  ctx.scene.tweens.killTweensOf([key.img, key.label, key.face])
  key.img.y = key.restY
  key.label.y = key.labelY
  key.face.y = key.faceY
  ctx.scene.tweens.add({
    targets: [key.img, key.label, key.face],
    y: '+=12',
    duration: 80,
    yoyo: true,
    ease: 'Quad.easeOut',
  })

  // A note floats up out of the key.
  const note = ctx.pool.spawn('note', key.x, key.top - 20)
  note.setTint(color)
  note.setAlpha(gainScale)
  note.setScale(0.5)
  note.setAngle(ctx.rng.between(-15, 15))
  ctx.scene.tweens.add({
    targets: note,
    x: key.x + ctx.rng.between(-50, 50),
    y: key.top - ctx.rng.between(170, 280),
    angle: ctx.rng.between(-25, 25),
    duration: 1500,
    ease: 'Sine.easeOut',
  })
  ctx.pool.retire(note, 900, 500)
}

const pianoKey: Toy = {
  name: 'pianoKey',
  match: () => true,

  play(e, ctx) {
    const i = keyIndex(e, ctx.width, keys.length)
    const key = keys[i]
    if (!key) return
    const color = ctx.color(i)
    playKey(i, ctx)

    // Only player notes schedule echoes. Replaying the echo cannot recurse.
    if (playground) {
      echoes?.schedule(i)
    } else if (choralQueue && phraseDetector) {
      choralQueue.cancel()
      const phrase = phraseDetector.recordNote(i, performance.now())
      if (phrase) {
        choralQueue.schedulePhrase(phrase)
      }
    }

    // Letters ride up alongside, so a pressed A still shows an A.
    if (e.isLetter) {
      const txt = ctx.text.spawn(e.char, key.x, key.top - 70, 110)
      txt.setColor('#' + color.toString(16).padStart(6, '0'))
      txt.setScale(0.3)
      ctx.scene.tweens.add({ targets: txt, scale: 1, duration: 320, ease: 'Back.easeOut' })
      ctx.scene.tweens.add({ targets: txt, y: key.top - 220, duration: 1600, ease: 'Sine.easeOut' })
      ctx.text.retire(txt, 900)
    }
  },
}

export const piano: Mode = {
  name: 'piano',
  label: 'Piano',
  icon: 'iconPiano',
  toys: [pianoKey],
  enter: buildKeys,
  setPlayground,
  replayNote: playKey,
}
