import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChoralEchoQueue, type ChoralEchoOptions } from './choralEchoQueue'
import type { ChoralPhrase } from './pianoChoralLogic'

describe('ChoralEchoQueue', () => {
  const options: ChoralEchoOptions = {
    responseDelayMs: 550,
    stepIntervalMs: 280,
    echoGain: 0.45,
  }

  const samplePhrase: ChoralPhrase = {
    notes: [0, 2, 4],
    harmonies: [2, 4, 6],
    animals: ['frog', 'bird', 'frog'],
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('schedules 3 notes at exact delayed intervals', () => {
    const onStep = vi.fn()
    const queue = new ChoralEchoQueue(onStep, options)

    expect(queue.isBusy).toBe(false)
    queue.schedulePhrase(samplePhrase)
    expect(queue.isBusy).toBe(true)

    // Before responseDelayMs (550ms)
    vi.advanceTimersByTime(549)
    expect(onStep).not.toHaveBeenCalled()

    // Step 0 at 550ms
    vi.advanceTimersByTime(1)
    expect(onStep).toHaveBeenCalledTimes(1)
    expect(onStep).toHaveBeenLastCalledWith(0, 2, 'frog', 0.45, 0)
    expect(queue.isBusy).toBe(true)

    // Step 1 at 550 + 280 = 830ms
    vi.advanceTimersByTime(280)
    expect(onStep).toHaveBeenCalledTimes(2)
    expect(onStep).toHaveBeenLastCalledWith(2, 4, 'bird', 0.45, 1)
    expect(queue.isBusy).toBe(true)

    // Step 2 at 550 + 560 = 1110ms
    vi.advanceTimersByTime(280)
    expect(onStep).toHaveBeenCalledTimes(3)
    expect(onStep).toHaveBeenLastCalledWith(4, 6, 'frog', 0.45, 2)
    expect(queue.isBusy).toBe(false)
  })

  it('cancel() prevents any remaining steps from firing and resets isBusy', () => {
    const onStep = vi.fn()
    const queue = new ChoralEchoQueue(onStep, options)

    queue.schedulePhrase(samplePhrase)
    vi.advanceTimersByTime(550) // fires step 0
    expect(onStep).toHaveBeenCalledTimes(1)

    queue.cancel()
    expect(queue.isBusy).toBe(false)

    vi.advanceTimersByTime(1000)
    expect(onStep).toHaveBeenCalledTimes(1) // no further steps
  })

  it('scheduling a new phrase cleanly replaces any active/pending phrase', () => {
    const onStep = vi.fn()
    const queue = new ChoralEchoQueue(onStep, options)

    queue.schedulePhrase(samplePhrase)
    vi.advanceTimersByTime(300) // before step 0

    const newPhrase: ChoralPhrase = {
      notes: [1, 3, 5],
      harmonies: [3, 5, 7],
      animals: ['kitten', 'puppy', 'kitten'],
    }
    queue.schedulePhrase(newPhrase)

    // 550ms from second schedule
    vi.advanceTimersByTime(550)
    expect(onStep).toHaveBeenCalledTimes(1)
    expect(onStep).toHaveBeenLastCalledWith(1, 3, 'kitten', 0.45, 0)
  })

  it('swallows callback exceptions without throwing or breaking queue', () => {
    const throwingStep = vi.fn().mockImplementation(() => {
      throw new Error('synth error')
    })
    const queue = new ChoralEchoQueue(throwingStep, options)

    queue.schedulePhrase(samplePhrase)
    expect(() => vi.advanceTimersByTime(550)).not.toThrow()
    expect(throwingStep).toHaveBeenCalledTimes(1)
    expect(() => vi.advanceTimersByTime(280)).not.toThrow()
    expect(throwingStep).toHaveBeenCalledTimes(2)
    expect(() => vi.advanceTimersByTime(280)).not.toThrow()
    expect(throwingStep).toHaveBeenCalledTimes(3)
    expect(queue.isBusy).toBe(false)
  })
})
