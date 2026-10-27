import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from '../config'
import { EchoQueue } from './rewards'

describe('earned piano echoes', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('plays one quieter copy after 600 ms and never recursively repeats it', () => {
    const play = vi.fn()
    const echoes = new EchoQueue(play, CONFIG.challenges)
    echoes.schedule(3)
    expect(echoes.pending).toBe(1)
    vi.advanceTimersByTime(599)
    expect(play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(play).toHaveBeenCalledExactlyOnceWith(3, 0.35)
    expect(echoes.pending).toBe(0)
    vi.advanceTimersByTime(6000)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('caps pending responses under sustained mashing and admits notes after they finish', () => {
    const play = vi.fn()
    const echoes = new EchoQueue(play, CONFIG.challenges)
    for (let index = 0; index < 100; index++) echoes.schedule(index)
    expect(echoes.pending).toBe(4)
    expect(vi.getTimerCount()).toBe(4)
    vi.advanceTimersByTime(600)
    expect(play.mock.calls.map(([index]) => index)).toEqual([0, 1, 2, 3])
    echoes.schedule(8)
    vi.advanceTimersByTime(600)
    expect(play).toHaveBeenLastCalledWith(8, 0.35)
    expect(echoes.pending).toBe(0)
  })

  it('cancels all pending echoes on leaving the power and can start a fresh entry', () => {
    const play = vi.fn()
    const echoes = new EchoQueue(play, CONFIG.challenges)
    echoes.schedule(2)
    echoes.schedule(4)
    vi.advanceTimersByTime(500)
    echoes.cancel()
    echoes.cancel()
    expect(echoes.pending).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(play).not.toHaveBeenCalled()
    echoes.schedule(7)
    vi.advanceTimersByTime(600)
    expect(play).toHaveBeenCalledExactlyOnceWith(7, 0.35)
  })

  it('contains optional rendering errors and frees the pending slot', () => {
    const echoes = new EchoQueue(() => { throw new Error('scene unavailable') }, CONFIG.challenges)
    echoes.schedule(0)
    expect(() => vi.advanceTimersByTime(600)).not.toThrow()
    expect(echoes.pending).toBe(0)
  })
})
