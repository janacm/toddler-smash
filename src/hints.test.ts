import { describe, expect, it } from 'vitest'
import { CONFIG } from './config'
import { computeIdleHint } from './hints'

describe('computeIdleHint', () => {
  const cfg = CONFIG.hints

  it('stays inactive before idleDelayMs (5 seconds)', () => {
    expect(computeIdleHint(0, cfg).active).toBe(false)
    expect(computeIdleHint(4999, cfg).active).toBe(false)
    expect(computeIdleHint(-100, cfg).active).toBe(false)
    expect(computeIdleHint(NaN, cfg).active).toBe(false)
  })

  it('activates at idleDelayMs and triggers a burst', () => {
    const start = computeIdleHint(cfg.idleDelayMs, cfg)
    expect(start.active).toBe(true)
    expect(start.burst).toBeCloseTo(0, 5)

    const mid = computeIdleHint(cfg.idleDelayMs + cfg.burstMs / 2, cfg)
    expect(mid.active).toBe(true)
    expect(mid.burst).toBeCloseTo(1, 5)
    expect(mid.pulse).toBeCloseTo(0.5, 5)
  })

  it('produces non-zero shakeX and upward bounceY during a burst', () => {
    const samples = [0.1, 0.25, 0.4, 0.6, 0.8].map((f) =>
      computeIdleHint(cfg.idleDelayMs + cfg.burstMs * f, cfg),
    )
    expect(samples.some((s) => Math.abs(s.shakeX) > 0.2)).toBe(true)
    expect(samples.some((s) => s.bounceY < -0.2)).toBe(true)
    expect(samples.every((s) => s.bounceY <= 0)).toBe(true)
  })

  it('rests between bursts while keeping arrowBob active', () => {
    const between = computeIdleHint(cfg.idleDelayMs + cfg.burstMs + 300, cfg)
    expect(between.active).toBe(true)
    expect(between.burst).toBe(0)
    expect(between.shakeX).toBe(0)
    expect(between.bounceY).toBe(0)
    expect(between.pulse).toBe(0)
    expect(Math.abs(between.arrowBob)).toBeLessThanOrEqual(1)
  })

  it('repeats the shake/bounce burst every intervalMs', () => {
    const secondBurstMid = computeIdleHint(
      cfg.idleDelayMs + cfg.intervalMs + cfg.burstMs / 2,
      cfg,
    )
    expect(secondBurstMid.active).toBe(true)
    expect(secondBurstMid.burst).toBeCloseTo(1, 5)
  })
})
