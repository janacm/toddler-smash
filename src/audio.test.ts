import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DINOSAUR_PARTIALS, Synth, type Voice } from './audio'
import { CONFIG } from './config'

class MockNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockGain extends MockNode {
  gain = {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
}

class MockOscillator extends MockNode {
  type = 'sine'
  frequency = {
    value: 0,
    setValueAtTime: vi.fn(function (this: { value: number }, val: number) {
      this.value = val
    }),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  onended: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
}

class MockAudioContext {
  static instances: MockAudioContext[] = []
  currentTime = 10
  state = 'running'
  destination = new MockNode()
  gains: MockGain[] = []
  oscs: MockOscillator[] = []
  resume = vi.fn()
  createGain = vi.fn(() => {
    const gain = new MockGain()
    this.gains.push(gain)
    return gain
  })
  createOscillator = vi.fn(() => {
    const osc = new MockOscillator()
    this.oscs.push(osc)
    return osc
  })

  constructor() { MockAudioContext.instances.push(this) }
}

const currentContext = () => MockAudioContext.instances.at(-1)!

describe('animal synth voices', () => {
  beforeEach(() => {
    MockAudioContext.instances = []
    vi.stubGlobal('window', { AudioContext: MockAudioContext })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each(['dinosaur', 'bubble'] as const)('%s keeps notes pentatonic and follows the mood', voice => {
    const synth = new Synth()
    synth.setMood(CONFIG.moods.bedtime.audio)
    synth.play(-1, voice, 0.5)
    const ctx = currentContext()
    const highA = CONFIG.audio.rootHz * Math.pow(2, 2 + 9 / 12)
    const base = highA / 2 // Bedtime's octave shift.
    expect(ctx.oscs.map(osc => osc.frequency.value)).toEqual(
      voice === 'dinosaur' ? [base / 4, base / 2, base, base * 2] : [base],
    )
    expect(ctx.oscs.map(osc => osc.type)).toEqual(
      voice === 'dinosaur' ? ['sine', 'sine', 'sine', 'sine'] : ['sine'],
    )
    expect(ctx.gains[0].gain.value).toBe(CONFIG.moods.bedtime.audio.volume)
    const duration = CONFIG.moods.bedtime.audio.noteMs / 1000 * (voice === 'dinosaur' ? 1 : 0.5)
    for (const osc of ctx.oscs) {
      expect(osc.start).toHaveBeenCalledExactlyOnceWith(10)
      expect(osc.stop).toHaveBeenCalledExactlyOnceWith(10 + duration)
    }
    expect(ctx.gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.55 * 0.5, 10 + duration * 0.08)
    expect(ctx.gains[1].gain.exponentialRampToValueAtTime).toHaveBeenLastCalledWith(0.0001, 10 + duration)
  })

  it('uses Daytime timbre for the dinosaur and wraps notes into the scale', () => {
    const synth = new Synth()
    synth.play(synth.noteCount, 'dinosaur')
    expect(currentContext().oscs.map(osc => [osc.type, osc.frequency.value])).toEqual([
      ['triangle', CONFIG.audio.rootHz / 4],
      ['triangle', CONFIG.audio.rootHz / 2],
      ['triangle', CONFIG.audio.rootHz],
      ['triangle', CONFIG.audio.rootHz * 2],
    ])
  })

  it('shares the voice cap with piano and blip and releases each animal slot once', () => {
    const synth = new Synth()
    const voices: Voice[] = ['piano', 'blip', 'dinosaur', ...Array<Voice>(5).fill('bubble')]
    voices.forEach(voice => synth.play(0, voice))
    const ctx = currentContext()
    const expectedCount = 4 + 2 + 4 + 5
    expect(ctx.oscs).toHaveLength(expectedCount)
    synth.play(0, 'dinosaur')
    expect(ctx.oscs).toHaveLength(expectedCount)

    const finished = ctx.oscs[6].onended!
    finished()
    finished()
    synth.play(1, 'bubble')
    synth.play(2, 'bubble')
    expect(ctx.oscs).toHaveLength(expectedCount + 1)
    expect(ctx.oscs[6].disconnect).toHaveBeenCalledOnce()
    expect(ctx.oscs[7].disconnect).toHaveBeenCalledOnce()
    expect(ctx.oscs[8].disconnect).toHaveBeenCalledOnce()
    expect(ctx.oscs[9].disconnect).toHaveBeenCalledOnce()
  })

  it('keeps existing voice accounting when setup fails before reserving a slot', () => {
    const synth = new Synth()
    for (let i = 0; i < CONFIG.limits.maxVoices - 1; i++) synth.play(i, 'bubble')
    const ctx = currentContext()
    ctx.createOscillator.mockImplementationOnce(() => { throw new Error('audio unavailable') })
    expect(() => synth.play(0, 'dinosaur')).not.toThrow()
    expect(ctx.gains.at(-1)!.disconnect).toHaveBeenCalledOnce()
    synth.play(0, 'bubble')
    synth.play(0, 'bubble')
    expect(ctx.oscs).toHaveLength(CONFIG.limits.maxVoices)
  })

  it('stops and disconnects partial audio after a scheduling error and reuses the slot', () => {
    const synth = new Synth()
    synth.unlock()
    const ctx = currentContext()
    const broken = new MockOscillator()
    broken.stop.mockImplementationOnce(() => { throw new Error('cannot schedule') })
    ctx.createOscillator.mockImplementationOnce(() => {
      ctx.oscs.push(broken)
      return broken
    })
    expect(() => synth.play(0, 'dinosaur')).not.toThrow()
    for (const osc of ctx.oscs) {
      expect(osc.stop).toHaveBeenCalledWith()
      expect(osc.disconnect).toHaveBeenCalledOnce()
      expect(osc.onended).toBeNull()
    }
    for (const gain of ctx.gains.slice(1)) expect(gain.disconnect).toHaveBeenCalledOnce()
    for (let i = 0; i <= CONFIG.limits.maxVoices; i++) synth.play(i, 'bubble')
    expect(ctx.oscs).toHaveLength(4 + CONFIG.limits.maxVoices)
  })

  it('contains unavailable audio and ignores silent or invalid gain without allocating nodes', () => {
    const synth = new Synth()
    synth.play(0, 'dinosaur', 0)
    synth.play(0, 'bubble', Number.NaN)
    expect(MockAudioContext.instances).toHaveLength(0)
    vi.stubGlobal('window', {})
    expect(() => synth.play(0, 'dinosaur')).not.toThrow()
    expect(MockAudioContext.instances).toHaveLength(0)
    vi.stubGlobal('window', { AudioContext: MockAudioContext })
    synth.play(0, 'bubble')
    expect(currentContext().oscs).toHaveLength(1)
  })

  it('plays choral voice with two detuned sines and 4.5Hz vibrato', () => {
    const synth = new Synth()
    synth.play(0, 'choral', 0.8)
    const ctx = currentContext()
    expect(ctx.oscs).toHaveLength(3) // 1 LFO + 2 voice oscillators
    const lfo = ctx.oscs[0]
    expect(lfo.type).toBe('sine')
    expect(lfo.frequency.value).toBe(4.5)

    const baseFreq = CONFIG.audio.rootHz
    const osc1 = ctx.oscs[1]
    const osc2 = ctx.oscs[2]
    expect(osc1.type).toBe('sine')
    expect(osc2.type).toBe('sine')
    expect(osc1.frequency.value).toBeCloseTo(baseFreq * Math.pow(2, 3.5 / 1200), 2)
    expect(osc2.frequency.value).toBeCloseTo(baseFreq * Math.pow(2, -3.5 / 1200), 2)

    // Master gain is index 0. Main voice gain is index 1.
    const mainGain = ctx.gains[1]
    expect(mainGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 10)
    expect(mainGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.7 * 0.8, 10 + 0.035)
    expect(mainGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 10 + 0.45)

    for (const osc of ctx.oscs) {
      expect(osc.start).toHaveBeenCalledWith(10)
      expect(osc.stop).toHaveBeenCalledWith(10 + 0.45)
    }

    // Counts as 1 voice: fill up remaining 7 voices
    for (let i = 0; i < 7; i++) synth.play(i, 'bubble')
    expect(ctx.oscs).toHaveLength(3 + 7)

    // Voice cap reached (8 voices). Next play is dropped.
    synth.play(0, 'choral')
    expect(ctx.oscs).toHaveLength(10)

    // When choral voice ends, 1 slot is released
    const endChoral = ctx.oscs[1].onended!
    endChoral()
    synth.play(0, 'bubble')
    expect(ctx.oscs).toHaveLength(11)
  })

  it('safely handles errors during choral setup without leaking voice count', () => {
    const synth = new Synth()
    synth.unlock()
    const ctx = currentContext()
    ctx.createOscillator.mockImplementationOnce(() => {
      throw new Error('osc error')
    })
    expect(() => synth.play(0, 'choral')).not.toThrow()
    for (let i = 0; i < CONFIG.limits.maxVoices; i++) synth.play(i, 'bubble')
    expect(ctx.oscs).toHaveLength(CONFIG.limits.maxVoices)
  })

  it('pop voice stays on pentatonic frequency with triangle wave and woody envelope', () => {
    const synth = new Synth()
    synth.play(0, 'pop', 0.8)
    const ctx = currentContext()
    expect(ctx.oscs).toHaveLength(1)
    const osc = ctx.oscs[0]
    expect(osc.type).toBe('triangle')
    const baseFreq = CONFIG.audio.rootHz
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(baseFreq, 10)
    expect(osc.start).toHaveBeenCalledWith(10)

    const dur = Math.max(0.04, 0.08 * (CONFIG.moods.daytime.audio.noteMs / 620))
    expect(osc.stop).toHaveBeenCalledWith(10 + dur)

    const gain = ctx.gains[1]
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0, 10)
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.85 * 0.8, 10.003)
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 10 + dur)
  })

  it('pop voice respects maxVoices and frees slot onended', () => {
    const synth = new Synth()
    for (let i = 0; i < CONFIG.limits.maxVoices; i++) synth.play(i, 'pop')
    const ctx = currentContext()
    expect(ctx.oscs).toHaveLength(CONFIG.limits.maxVoices)

    // Over cap: ignored
    synth.play(0, 'pop')
    expect(ctx.oscs).toHaveLength(CONFIG.limits.maxVoices)

    // Free first slot
    const ended = ctx.oscs[0].onended!
    ended()
    synth.play(0, 'pop')
    expect(ctx.oscs).toHaveLength(CONFIG.limits.maxVoices + 1)
  })

  it('pop voice cleans up properly on scheduling error', () => {
    const synth = new Synth()
    synth.unlock()
    const ctx = currentContext()
    const broken = new MockOscillator()
    broken.start.mockImplementationOnce(() => { throw new Error('failed start') })
    ctx.createOscillator.mockImplementationOnce(() => {
      ctx.oscs.push(broken)
      return broken
    })
    expect(() => synth.play(0, 'pop')).not.toThrow()
    expect(broken.disconnect).toHaveBeenCalledOnce()
    expect(broken.onended).toBeNull()
  })

  it('includes overtones in the 200-450 Hz range for phone speaker audibility across all pentatonic notes', () => {
    const synth = new Synth()
    for (let i = 0; i < 5; i++) {
      synth.play(i, 'dinosaur')
      const ctx = currentContext()
      const dinoOscs = ctx.oscs.slice(-DINOSAUR_PARTIALS.length)
      const freqs = dinoOscs.map(osc => osc.frequency.value)

      // Must include mid-range presence (>150 Hz) audible on small mobile speakers
      const mobileAudibleFreqs = freqs.filter(f => f >= 150 && f <= 450)
      expect(mobileAudibleFreqs.length).toBeGreaterThanOrEqual(1)

      // Every partial frequency must be an exact pentatonic scale note or octave
      for (const f of freqs) {
        const root = CONFIG.audio.rootHz
        const semitonesFromRoot = Math.round(12 * Math.log2(f / root))
        const pitchClass = ((semitonesFromRoot % 12) + 12) % 12
        expect(CONFIG.audio.scaleSemitones).toContain(pitchClass)
      }
    }
  })

  it('maintains audible overtones for Bedtime while using gentle sine waves and reduced volume', () => {
    const synth = new Synth()
    synth.setMood(CONFIG.moods.bedtime.audio)
    for (let i = 0; i < 5; i++) {
      synth.play(i, 'dinosaur')
      const ctx = currentContext()
      const dinoOscs = ctx.oscs.slice(-DINOSAUR_PARTIALS.length)
      const freqs = dinoOscs.map(osc => osc.frequency.value)

      // Even the lowest Bedtime notes (C3 at 130 Hz fundamental) have overtones >= 150 Hz
      const mobileAudibleFreqs = freqs.filter(f => f >= 150 && f <= 450)
      expect(mobileAudibleFreqs.length).toBeGreaterThanOrEqual(1)

      // All Bedtime oscillators use gentle sine waves
      for (const osc of dinoOscs) {
        expect(osc.type).toBe('sine')
      }
    }
  })

  it('keeps sub-bass dominant while overtones remain subtle', () => {
    // 0.25 ratio has highest gain, higher overtones taper off
    expect(DINOSAUR_PARTIALS[0][0]).toBe(0.25)
    expect(DINOSAUR_PARTIALS[0][1]).toBeGreaterThan(DINOSAUR_PARTIALS[1][1])
    expect(DINOSAUR_PARTIALS[1][1]).toBeGreaterThan(DINOSAUR_PARTIALS[2][1])
    expect(DINOSAUR_PARTIALS[2][1]).toBeGreaterThan(DINOSAUR_PARTIALS[3][1])
    const totalGain = DINOSAUR_PARTIALS.reduce((sum, [, g]) => sum + g, 0)
    expect(totalGain).toBeLessThanOrEqual(1)
  })
})

describe('combo synth voices', () => {
  const timers: Array<{ fn: () => void; ms: number }> = []
  beforeEach(() => {
    MockAudioContext.instances = []
    timers.length = 0
    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
      setTimeout: (fn: () => void, ms: number) => timers.push({ fn, ms }),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each(['daytime', 'bedtime'] as const)('%s blips use the mood attack and overtone gain', name => {
    const synth = new Synth()
    synth.setMood(CONFIG.moods[name].audio)
    synth.play(0)
    const ctx = currentContext()
    const [, voiceGain, overtoneGain] = ctx.gains
    expect(voiceGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.9, 10 + CONFIG.moods[name].audio.attackMs / 1000)
    expect(overtoneGain.gain.value).toBe(CONFIG.moods[name].audio.harmonicGain)
  })

  it('never lets the attack outlast half the note', () => {
    const synth = new Synth()
    synth.setMood({ ...CONFIG.moods.daytime.audio, noteMs: 100, attackMs: 500 } as never)
    synth.play(0)
    expect(currentContext().gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.9, 10.05)
  })

  it('plays the arpeggio up the pentatonic table and wraps past the top', () => {
    const synth = new Synth()
    const { rootHz, scaleSemitones } = CONFIG.audio
    for (let step = 0; step < CONFIG.combo.maxCombo; step++) synth.playArpeggio(step)
    const blips = currentContext().oscs.filter((_, i) => i % 2 === 0).map(osc => osc.frequency.value)
    const expected = [0, 1, 2, 3, 4, 5].map(i =>
      rootHz * Math.pow(2, Math.floor(i / 5) + scaleSemitones[i % 5] / 12))
    expect(blips).toEqual(expected)
    expect([...blips].sort((a, b) => a - b)).toEqual(blips)

    synth.playArpeggio(synth.noteCount) // wraps to the first note
    expect(currentContext().oscs.at(-2)!.frequency.value).toBe(rootHz)
  })

  it('strums the warm chord 24 ms apart on pentatonic notes, within the voice cap', () => {
    const synth = new Synth()
    synth.playWarmChord(0)
    expect(timers.map(t => t.ms)).toEqual([0, 24, 48, 72])
    expect(MockAudioContext.instances).toHaveLength(0)
    timers.forEach(t => t.fn())
    const ctx = currentContext()
    const { rootHz } = CONFIG.audio
    expect(ctx.oscs.filter((_, i) => i % 2 === 0).map(o => o.frequency.value)).toEqual([
      rootHz, rootHz * Math.pow(2, 4 / 12), rootHz * Math.pow(2, 7 / 12), rootHz * 2,
    ])
    expect(ctx.gains[1].gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(0.9 * 0.85 * 0.6)
    expect(ctx.oscs.length / 2).toBeLessThanOrEqual(CONFIG.limits.maxVoices)
  })

  it('reserves capacity for the warm chord so prior active voices do not truncate chord notes', () => {
    const synth = new Synth()
    for (let i = 0; i < 6; i++) {
      synth.play(i, 'blip')
    }
    const ctx = currentContext()
    expect(ctx.oscs.length).toBe(12)

    synth.playWarmChord(0)
    timers.forEach(t => t.fn())
    expect(ctx.oscs.length).toBe(20)
    expect(ctx.oscs[0].stop).toHaveBeenCalled()
    expect(ctx.oscs[1].stop).toHaveBeenCalled()
  })

  describe('cues', () => {
    let now = 1000
    beforeEach(() => {
      now = 1000
      vi.spyOn(performance, 'now').mockImplementation(() => now)
    })
    afterEach(() => vi.restoreAllMocks())

    it('throttles to cueThrottleMs and plays again once it has passed', () => {
      const synth = new Synth()
      synth.playCue('bounce')
      now += CONFIG.audio.cueThrottleMs - 1
      synth.playCue('bounce')
      expect(currentContext().oscs).toHaveLength(1)
      now += 1
      synth.playCue('retire')
      expect(currentContext().oscs).toHaveLength(3) // bubble: 1 osc; blip: 2
    })

    it('is quieter in Bedtime in proportion to the mood volume', () => {
      const day = new Synth()
      day.playCue('bounce', 0.2)
      const dayRamp = currentContext().gains[1].gain.linearRampToValueAtTime.mock.calls[0][0]
      const night = new Synth()
      night.setMood(CONFIG.moods.bedtime.audio)
      night.playCue('bounce', 0.2)
      const nightRamp = currentContext().gains[1].gain.linearRampToValueAtTime.mock.calls[0][0]
      expect(nightRamp / dayRamp).toBeCloseTo(CONFIG.moods.bedtime.audio.volume / CONFIG.moods.daytime.audio.volume)
    })
  })
})
