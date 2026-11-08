import type { AnimalFaceKind, ChoralPhrase } from './pianoChoralLogic'

export interface ChoralEchoOptions {
  responseDelayMs: number
  stepIntervalMs: number
  echoGain: number
}

export type ChoralStepCallback = (
  noteIndex: number,
  harmonyIndex: number,
  animal: AnimalFaceKind,
  gain: number,
  stepNumber: number,
) => void

/**
 * Manages the timing and cancellation of a 3-note choral response.
 * Strictly capped to 1 active sequence at any time.
 */
export class ChoralEchoQueue {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()
  private active = false

  constructor(
    private readonly onStep: ChoralStepCallback,
    private readonly options: ChoralEchoOptions,
  ) {}

  get isBusy(): boolean {
    return this.active || this.timers.size > 0
  }

  schedulePhrase(phrase: ChoralPhrase): void {
    // If an echo is already pending or playing, cancel and replace cleanly
    this.cancel()
    this.active = true

    const { responseDelayMs, stepIntervalMs, echoGain } = this.options

    for (let i = 0; i < phrase.notes.length; i++) {
      const delay = responseDelayMs + i * stepIntervalMs
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        try {
          this.onStep(phrase.notes[i], phrase.harmonies[i], phrase.animals[i], echoGain, i)
        } catch {
          /* Swallowed: audio failure must never interrupt gameplay */
        }
        if (i === phrase.notes.length - 1) {
          this.active = false
        }
      }, delay)
      this.timers.add(timer)
    }
  }

  cancel(): void {
    for (const timer of this.timers) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.active = false
  }
}
