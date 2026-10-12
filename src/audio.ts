import { CONFIG, type Mood } from './config'

type MoodAudio = Mood['audio']

/** 'blip' is the default toy sound; 'piano' is a struck, ringing note. */
export type Voice = 'blip' | 'piano'

/** Harmonic partials of the piano voice and their relative loudness. */
const PIANO_PARTIALS: [number, number][] = [
  [1, 1],
  [2, 0.4],
  [3, 0.15],
  [4, 0.06],
]

/**
 * A tiny WebAudio synth. No audio files — every sound is generated, so the repo
 * stays pure text and an agent can change how the game *sounds* by editing
 * numbers instead of sourcing assets.
 *
 * Two things matter here for mash tolerance:
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
   * integer is valid — callers never have to bounds-check.
   */
  play(index: number, voice: Voice = 'blip'): void {
    this.unlock()
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    if (this.voices >= CONFIG.limits.maxVoices) return

    const n = this.noteTable.length
    const freq = this.noteTable[((index % n) + n) % n] * Math.pow(2, this.mood.octaveShift)
    if (voice === 'piano') {
      this.playPiano(ctx, master, freq)
      return
    }

    try {
      const now = ctx.currentTime
      const dur = this.mood.noteMs / 1000

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
      gain.gain.linearRampToValueAtTime(0.9, now + 0.012) // fast attack: feels responsive
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

      const gain2 = ctx.createGain()
      gain2.gain.value = 0.25

      osc.connect(gain)
      osc2.connect(gain2)
      gain2.connect(gain)
      gain.connect(master)

      this.voices++
      const done = () => {
        this.voices = Math.max(0, this.voices - 1)
        try {
          osc.disconnect()
          osc2.disconnect()
          gain.disconnect()
          gain2.disconnect()
        } catch {
          /* already torn down */
        }
      }
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
   * A struck string: sine partials sharing one envelope with a very fast
   * attack and a long exponential ring-out. Counts as one voice.
   */
  private playPiano(ctx: AudioContext, master: GainNode, freq: number): void {
    try {
      const now = ctx.currentTime
      const dur = this.mood.pianoMs / 1000

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.8, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.12)
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
      oscs[0].onended = () => {
        this.voices = Math.max(0, this.voices - 1)
        for (const node of nodes) {
          try {
            node.disconnect()
          } catch {
            /* already torn down */
          }
        }
      }
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
