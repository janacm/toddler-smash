import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Synth, type Voice } from './audio'
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
  frequency = { value: 0 }
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
      voice === 'dinosaur' ? [base / 4, base / 2] : [base],
    )
    expect(ctx.oscs.map(osc => osc.type)).toEqual(voice === 'dinosaur' ? ['sine', 'sine'] : ['sine'])
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
      ['triangle', CONFIG.audio.rootHz / 4], ['triangle', CONFIG.audio.rootHz / 2],
    ])
  })

  it('shares the voice cap with piano and blip and releases each animal slot once', () => {
    const synth = new Synth()
    const voices: Voice[] = ['piano', 'blip', 'dinosaur', ...Array<Voice>(5).fill('bubble')]
    voices.forEach(voice => synth.play(0, voice))
    const ctx = currentContext()
    const expectedCount = 4 + 2 + 2 + 5
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
    expect(ctx.oscs).toHaveLength(2 + CONFIG.limits.maxVoices)
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
})
