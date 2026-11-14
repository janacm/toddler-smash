import { CONFIG } from './config'

export interface IdleHintConfig {
  idleDelayMs: number
  intervalMs: number
  burstMs: number
}

export interface IdleHintState {
  /** True once `idleMs` reaches `idleDelayMs`. */
  active: boolean
  /** Smooth 0..1..0 envelope during each periodic shake/bounce burst. */
  burst: number
  /** Normalized horizontal shake (-1..1) during a burst. */
  shakeX: number
  /** Normalized upward bounce (-1..0) during a burst. */
  bounceY: number
  /** Smooth -1..1 continuous bobbing for pointing arrows while active. */
  arrowBob: number
  /** 0..1 expanding ring progress during a burst (0 outside burst). */
  pulse: number
}

const INACTIVE: IdleHintState = {
  active: false,
  burst: 0,
  shakeX: 0,
  bounceY: 0,
  arrowBob: 0,
  pulse: 0,
}

/**
 * Computes periodic shake, bounce, and arrow-bobbing values after `idleDelayMs`
 * of inactivity. Pure math so it can be unit-tested without Phaser.
 */
export function computeIdleHint(
  idleMs: number,
  cfg: IdleHintConfig = CONFIG.hints,
): IdleHintState {
  if (!Number.isFinite(idleMs) || idleMs < cfg.idleDelayMs) {
    return INACTIVE
  }

  const elapsed = idleMs - cfg.idleDelayMs
  const cycle = elapsed % cfg.intervalMs
  const inBurst = cycle < cfg.burstMs
  const phase = inBurst ? cycle / cfg.burstMs : 0
  const burst = inBurst ? Math.sin(phase * Math.PI) : 0

  return {
    active: true,
    burst,
    shakeX: inBurst ? burst * Math.sin(phase * Math.PI * 5) : 0,
    bounceY: inBurst ? -Math.abs(Math.sin(phase * Math.PI * 2)) * burst : 0,
    arrowBob: Math.sin(elapsed / 260),
    pulse: phase,
  }
}
