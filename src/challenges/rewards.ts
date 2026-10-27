interface EchoOptions {
  echoDelayMs: number
  maxEchoes: number
  echoGain: number
}

/** One quiet response per player note, with a hard cap and explicit teardown. */
export class EchoQueue {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>()

  constructor(
    private readonly play: (index: number, gain: number) => void,
    private readonly options: EchoOptions,
  ) {}

  get pending(): number {
    return this.timers.size
  }

  schedule(index: number): void {
    if (this.timers.size >= this.options.maxEchoes) return
    const timer = setTimeout(() => {
      if (!this.timers.delete(timer)) return
      try {
        // Call the note renderer directly. An echo never schedules an echo.
        this.play(index, this.options.echoGain)
      } catch {
        // Losing an optional echo must not interrupt the child's play.
      }
    }, this.options.echoDelayMs)
    this.timers.add(timer)
  }

  cancel(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
  }
}
