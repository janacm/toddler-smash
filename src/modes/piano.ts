import Phaser from 'phaser'
import { CONFIG } from '../config'
import { EchoQueue } from '../challenges/rewards'
import type { Toy, ToyContext } from '../toys/types'
import { keyIndex, pianoKeyCount } from './pianoLayout'
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
  x: number
  top: number
  restY: number
  labelY: number
}

let keys: PianoKey[] = []
let playground = false
let echoes: EchoQueue | undefined

function setPlayground(active: boolean): void {
  playground = active
  if (!active) echoes?.cancel()
}

function buildKeys(ctx: ToyContext): () => void {
  setPlayground(false)
  const entryEchoes = new EchoQueue((index, gain) => playKey(index, ctx, gain), CONFIG.challenges)
  echoes = entryEchoes
  const { heightFrac, gapPx } = CONFIG.piano
  const n = pianoKeyCount(ctx.width)
  // Number labels only mean something when they match the number row.
  const showLabels = n === CONFIG.piano.keys
  const margin = ctx.width * 0.04
  const keyW = (ctx.width - margin * 2 - gapPx * (n - 1)) / n
  const keyH = ctx.height * heightFrac
  const top = ctx.height - keyH - ctx.height * 0.04

  keys = []
  for (let i = 0; i < n; i++) {
    const x = margin + i * (keyW + gapPx) + keyW / 2
    const restY = top + keyH / 2
    const labelY = top + keyH - Math.min(keyW * 0.45, 44)

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

    // Rise into place one after another when the piano appears.
    const drop = keyH * 0.6
    img.y += drop
    label.y += drop
    ctx.scene.tweens.add({
      targets: [img, label],
      y: `-=${drop}`,
      delay: i * 35,
      duration: 380,
      ease: 'Back.easeOut',
    })

    keys.push({ img, label, x, top, restY, labelY })
  }

  const entryKeys = keys
  return () => {
    setPlayground(false)
    entryEchoes.cancel()
    if (echoes === entryEchoes) echoes = undefined
    for (const key of entryKeys) {
      ctx.scene.tweens.killTweensOf([key.img, key.label])
      key.img.destroy()
      key.label.destroy()
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
  ctx.scene.tweens.killTweensOf([key.img, key.label])
  key.img.y = key.restY
  key.label.y = key.labelY
  ctx.scene.tweens.add({
    targets: [key.img, key.label],
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
    if (playground) echoes?.schedule(i)

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
