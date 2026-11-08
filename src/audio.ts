import { CONFIG, type Mood } from './config'
import { comboChordIndices, comboNoteIndex } from './combo'

type MoodAudio = Mood['audio']

/** Toy voices share the same pentatonic notes, mood volume and voice cap. */
export type Voice = 'blip' | 'piano' | 'dinosaur' | 'bubble'

/** Harmonic partials of the piano voice and their relative loudness. */
const PIANO_PARTIALS: [number, number][] = [
  [1, 1],
  [2, 0.4],
  [3, 0.15],
  [4, 0.06],
]

/**
 * Harmonic partials of the dinosaur voice and their relative loudness.
 *
 * Phone and tablet speakers roll off sharply below ~150 Hz, which leaves pure
 * low-frequency rumble (Daytime 65-110 Hz, Bedtime 33-55 Hz) inaudible on
 * handheld devices. Octave overtones (1 and 2) provide mid-frequency presence
 * in the 200-450 Hz range so small speaker drivers convey the roar and stomp,
 * while pure octave intervals preserve pentatonic consonance and Bedtime calm.
 */
export const DINOSAUR_PARTIALS: [number, number][] = [
  [0.25, 0.5],
  [0.5, 0.25],
  [1, 0.18],
  [2, 0.07],
]

/**
 * A tiny WebAudio synth. No audio files — every sound is generated, so the repo
 * stays pure text and an agent can change how the game *sounds* by editing
 * numbers instead of sourcing assets.
 *
 * Two safeguards preserve mash tolerance:
 *
 *  1. Voices are capped. Fifty keypresses in one second will not stack fifty
 *     oscillators and blow the output into clipping distortion.
 *  2. Notes are quantised to a pentatonic scale (see CONFIG.audio), so random
 *     input is consonant by construction.
 */
export class Synth {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices = 0
  private noteTable: number[] = []
  private mood: MoodAudio = CONFIG.moods.daytime.audio
  private lastCueAt = Number.NEGATIVE_INFINITY
  private activeVoiceCleanups: Array<() => void> = []

  constructor() {
    const { scaleSemitones, rootHz, octaves } = CONFIG.audio
    for (let o = 0; o < octaves; o++) {
      for (const s of scaleSemitones) {
        this.noteTable.push(rootHz * Math.pow(2, o + s / 12))
      }
    }
  }

  /** Frequencies available, low to high. */
  get noteCount(): number {
    return this.noteTable.length
  }

  /**
   * Lazily create the AudioContext. Browsers refuse to start audio outside a
   * user gesture, so this is called from the first real input rather than at
   * load. Safe to call repeatedly.
   */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext =
          window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.mood.volume
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      // Audio is a nice-to-have. A device that refuses it still gets a game.
      this.ctx = null
    }
  }

  /** Volume, waveform, note length and octave all follow the mood. */
  setMood(audio: MoodAudio): void {
    this.mood = audio
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(audio.volume, this.ctx.currentTime, 0.15)
    }
  }

  /**
   * Play note `index` from the pentatonic table. Index is wrapped, so any
   * integer is valid — callers never have to bounds-check. An optional gain
   * multiplier makes earned echoes quieter without increasing the voice cap.
   */
  play(index: number, voice: Voice = 'blip', gainScale = 1): void {
    const level = Math.max(0, Math.min(1, gainScale))
    if (!Number.isFinite(level) || level === 0) return
    this.unlock()
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    if (this.voices >= CONFIG.limits.maxVoices) return

    const n = this.noteTable.length
    const freq = this.noteTable[((index % n) + n) % n] * Math.pow(2, this.mood.octaveShift)
    if (voice === 'piano') {
      this.playPiano(ctx, master, freq, level)
      return
    }
    if (voice === 'dinosaur' || voice === 'bubble') {
      this.playAnimal(ctx, master, freq, voice, level)
      return
    }

    try {
      const now = ctx.currentTime
      const dur = this.mood.noteMs / 1000
      // Daytime is snappy; Bedtime swells in so there is never a click.
      const attack = Math.min(this.mood.attackMs / 1000, dur / 2)

      const osc = ctx.createOscillator()
      osc.type = this.mood.wave
      osc.frequency.value = freq

      // A second oscillator a fifth up, quieter, gives the blip some body
      // without needing a sample.
      const osc2 = ctx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 1.5

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.9 * level, now + attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

      const gain2 = ctx.createGain()
      gain2.gain.value = this.mood.harmonicGain

      osc.connect(gain)
      osc2.connect(gain2)
      gain2.connect(gain)
      gain.connect(master)

      this.voices++
      const done = () => {
        this.voices = Math.max(0, this.voices - 1)
        const idx = this.activeVoiceCleanups.indexOf(done)
        if (idx !== -1) this.activeVoiceCleanups.splice(idx, 1)
        try {
          osc.onended = null
          osc.stop()
          osc2.stop()
        } catch {
          /* already stopped or not started */
        }
        try {
          osc.disconnect()
          osc2.disconnect()
          gain.disconnect()
          gain2.disconnect()
        } catch {
          /* already torn down */
        }
      }
      this.activeVoiceCleanups.push(done)
      osc.onended = done

      osc.start(now)
      osc2.start(now)
      osc.stop(now + dur)
      osc2.stop(now + dur)
    } catch {
      this.voices = Math.max(0, this.voices - 1)
    }
  }

  /**
   * Note `step` of the ascending combo arpeggio (C, D, E, G, A, C...). The base
   * is the bottom of the table, so a full streak stays on the pentatonic scale.
   */
  playArpeggio(step: number, voice: Voice = 'blip', gainScale = 1): void {
    this.play(comboNoteIndex(step, 0, this.noteTable.length), voice, gainScale)
  }

  /**
   * Ensure there is enough voice capacity to play `needed` notes without
   * hitting the global `maxVoices` limit, retiring the oldest voices if needed.
   */
  reserveVoiceCapacity(needed: number): void {
    const maxAllowed = Math.max(0, CONFIG.limits.maxVoices - needed)
    while (this.voices > maxAllowed && this.activeVoiceCleanups.length > 0) {
      const oldest = this.activeVoiceCleanups.shift()
      oldest?.()
    }
    if (this.voices > maxAllowed) {
      this.voices = maxAllowed
    }
  }

  /**
   * A warm pentatonic chord (root, third, fifth, octave) strummed 24 ms apart.
   * Four voices, so it fits under `maxVoices` alongside the arpeggio note.
   */
  playWarmChord(baseIndex = 0, gainScale = 0.85): void {
    this.reserveVoiceCapacity(4)
    comboChordIndices(baseIndex).forEach((note, i) => {
      window.setTimeout(() => this.play(note, 'blip', gainScale * 0.6), i * 24)
    })
  }

  /**
   * A quiet cue for a physical event (a shape landing). Throttled so a mashed
   * keyboard can't click-spam, and scaled by the mood so Bedtime stays hushed.
   */
  playCue(type: 'bounce' | 'retire', gainScale = 0.2): void {
    const now = performance.now()
    if (now - this.lastCueAt < CONFIG.audio.cueThrottleMs) return
    this.lastCueAt = now
    const moodFactor = this.mood.volume / CONFIG.moods.daytime.audio.volume
    if (type === 'bounce') this.play(2, 'bubble', gainScale * moodFactor)
    else this.play(7, 'blip', gainScale * moodFactor)
  }

  /**
   * Soft animal reactions: octave-only pitches, with character in the envelope.
   * Dinosaur uses `DINOSAUR_PARTIALS` (sub-bass 0.25, bass 0.5, and overtones 1 and 2)
   * so the stomp and rumble translate clearly on small phone/tablet speakers while
   * remaining gentle, pleasant, and pentatonic in Bedtime.
   */
  private playAnimal(
    ctx: AudioContext,
    master: GainNode,
    freq: number,
    voice: 'dinosaur' | 'bubble',
    level: number,
  ): void {
    const nodes: AudioNode[] = []
    const oscs: OscillatorNode[] = []
    let counted = false
    let finished = false
    const cleanupVoice = () => cleanup(true)
    const cleanup = (interrupt = false) => {
      if (finished) return
      finished = true
      if (counted) {
        this.voices = Math.max(0, this.voices - 1)
        const idx = this.activeVoiceCleanups.indexOf(cleanupVoice)
        if (idx !== -1) this.activeVoiceCleanups.splice(idx, 1)
      }
      for (const osc of oscs) {
        osc.onended = null
        if (interrupt) {
          try {
            osc.stop()
          } catch {
            /* not started or already stopped */
          }
        }
      }
      for (const node of nodes) {
        try {
          node.disconnect()
        } catch {
          /* already torn down */
        }
      }
    }

    try {
      const now = ctx.currentTime
      const dinosaur = voice === 'dinosaur'
      const dur = (this.mood.noteMs / 1000) * (dinosaur ? 1 : 0.5)
      const gain = ctx.createGain()
      nodes.push(gain)
      gain.gain.setValueAtTime(0, now)
      if (dinosaur) {
        // A low, gently wobbling "rrrum"; no noisy or startling roar.
        for (const [time, amount] of [
          [0.08, 0.55],
          [0.26, 0.25],
          [0.4, 0.45],
          [0.57, 0.2],
          [0.7, 0.3],
        ]) {
          gain.gain.linearRampToValueAtTime(amount * level, now + dur * time)
        }
      } else {
        // A rounded plop: a short sine note, without a dissonant pitch slide.
        gain.gain.linearRampToValueAtTime(0.55 * level, now + dur * 0.08)
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
      gain.connect(master)

      const partials: [number, number][] = dinosaur ? DINOSAUR_PARTIALS : [[1, 1]]
      for (const [ratio, amount] of partials) {
        const osc = ctx.createOscillator()
        nodes.push(osc)
        oscs.push(osc)
        osc.type = dinosaur ? this.mood.wave : 'sine'
        osc.frequency.value = freq * ratio
        const partialGain = ctx.createGain()
        nodes.push(partialGain)
        partialGain.gain.value = amount
        osc.connect(partialGain)
        partialGain.connect(gain)
      }

      this.voices++
      counted = true
      this.activeVoiceCleanups.push(cleanupVoice)
      oscs[0].onended = () => cleanup()
      for (const osc of oscs) {
        osc.start(now)
        osc.stop(now + dur)
      }
    } catch {
      // Partial setup must not leak nodes or steal an already-playing slot.
      cleanup(true)
    }
  }

  /**
   * A struck string: sine partials sharing one envelope with a very fast
   * attack and a long exponential ring-out. Counts as one voice.
   */
  private playPiano(ctx: AudioContext, master: GainNode, freq: number, level: number): void {
    try {
      const now = ctx.currentTime
      const dur = this.mood.pianoMs / 1000

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.8 * level, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.25 * level, now + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
      gain.connect(master)

      const nodes: AudioNode[] = [gain]
      const oscs = PIANO_PARTIALS.map(([ratio, level]) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq * ratio
        const partialGain = ctx.createGain()
        partialGain.gain.value = level * 0.6
        osc.connect(partialGain)
        partialGain.connect(gain)
        nodes.push(osc, partialGain)
        return osc
      })

      this.voices++
      const done = (interrupt = false) => {
        this.voices = Math.max(0, this.voices - 1)
        const idx = this.activeVoiceCleanups.indexOf(doneVoice)
        if (idx !== -1) this.activeVoiceCleanups.splice(idx, 1)
        for (const osc of oscs) {
          osc.onended = null
          if (interrupt) {
            try {
              osc.stop()
            } catch {
              /* already stopped or not started */
            }
          }
        }
        for (const node of nodes) {
          try {
            node.disconnect()
          } catch {
            /* already torn down */
          }
        }
      }
      const doneVoice = () => done(true)
      this.activeVoiceCleanups.push(doneVoice)
      oscs[0].onended = () => done()
      for (const osc of oscs) {
        osc.start(now)
        osc.stop(now + dur)
      }
    } catch {
      this.voices = Math.max(0, this.voices - 1)
    }
  }

  /** A short descending flourish. Used for the occasional "big" event. */
  chime(): void {
    const base = Math.floor(this.noteTable.length * 0.55)
    for (let i = 0; i < 3; i++) {
      window.setTimeout(() => this.play(base + i * 2), i * 70)
    }
  }
}
