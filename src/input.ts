import { CONFIG } from './config'
import type { SmashEvent } from './toys/types'

export interface InputHooks {
  onSmash(e: SmashEvent): void
  onParentEscape(): void
}

/**
 * Turns a keyboard, a mouse, and a set of sticky fingers into a single stream
 * of SmashEvents.
 *
 * Most of this file is defensive. The design assumption is that the person at
 * the keyboard cannot read, cannot be told "don't press that", and will find
 * every key you forgot about.
 */
export function installInput(canvasParent: HTMLElement, hooks: InputHooks): () => void {
  let counter = 0
  let lastSpawn = 0
  let escapeHeldSince = 0

  const width = () => window.innerWidth
  const height = () => window.innerHeight

  /** Rate limit. Returns false when we should skip the visual for this event. */
  const allowSpawn = (): boolean => {
    const now = performance.now()
    if (now - lastSpawn < CONFIG.limits.minSpawnIntervalMs) return false
    lastSpawn = now
    return true
  }

  const emit = (x: number, y: number, char: string, source: 'key' | 'pointer') => {
    if (!allowSpawn()) return
    const isLetter = /^[A-Z]$/.test(char)
    const isDigit = /^[0-9]$/.test(char)
    hooks.onSmash({ x, y, char, isLetter, isDigit, index: counter++, source })
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    // Let the grown-up combination through untouched.
    if (ev.key === CONFIG.parentEscape.key) {
      if (escapeHeldSince === 0) escapeHeldSince = performance.now()
      ev.preventDefault()
      return
    }

    // Swallow browser shortcuts: F5 reload, Tab focus jumps, space scroll,
    // quick-find, print, save. This is most of what makes a browser game
    // hostile to a toddler.
    if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) ev.preventDefault()

    // A held key repeats ~30x/sec at the OS level. Ignoring repeats means a
    // forearm resting on the keyboard produces one burst per key and then
    // goes quiet, instead of a machine-gun that never stops.
    if (ev.repeat) return

    const char = normalizeChar(ev.key)

    // Position each key roughly where it sits on the keyboard, so sweeping
    // left-to-right sweeps across the screen. Unknown keys land randomly.
    const x = keyToX(ev.code, width())
    const y = keyToY(ev.code, height())
    emit(x, y, char, 'key')
  }

  const onKeyUp = (ev: KeyboardEvent) => {
    if (ev.key === CONFIG.parentEscape.key) escapeHeldSince = 0
  }

  const onPointer = (ev: PointerEvent) => {
    ev.preventDefault()
    emit(ev.clientX, ev.clientY, '', 'pointer')
  }

  // Check the parent hold on a timer rather than in keydown, because key
  // repeat can be disabled at the OS level and we cannot rely on it firing.
  const holdTimer = window.setInterval(() => {
    if (escapeHeldSince > 0 && performance.now() - escapeHeldSince >= CONFIG.parentEscape.holdMs) {
      escapeHeldSince = 0
      hooks.onParentEscape()
    }
  }, 120)

  const blockContext = (ev: Event) => ev.preventDefault()

  window.addEventListener('keydown', onKeyDown, { passive: false })
  window.addEventListener('keyup', onKeyUp)
  canvasParent.addEventListener('pointerdown', onPointer, { passive: false })
  window.addEventListener('contextmenu', blockContext)

  return () => {
    window.clearInterval(holdTimer)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvasParent.removeEventListener('pointerdown', onPointer)
    window.removeEventListener('contextmenu', blockContext)
  }
}

/** '' for anything that is not a single printable character. */
function normalizeChar(key: string): string {
  if (key.length !== 1) return ''
  const upper = key.toUpperCase()
  return /^[A-Z0-9]$/.test(upper) ? upper : ''
}

/** Approximate horizontal position of a physical key, 0..1 across the board. */
const ROWS: Record<string, string[]> = {
  digit: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  top: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  home: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  bottom: ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
}

function rowOf(code: string): { row: keyof typeof ROWS; idx: number } | null {
  const letter = code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : ''
  if (!letter) return null
  for (const row of Object.keys(ROWS) as (keyof typeof ROWS)[]) {
    const idx = ROWS[row].indexOf(letter)
    if (idx >= 0) return { row, idx }
  }
  return null
}

function keyToX(code: string, w: number): number {
  const pos = rowOf(code)
  if (!pos) return w * (0.2 + Math.random() * 0.6)
  const frac = (pos.idx + 0.5) / ROWS[pos.row].length
  return w * (0.1 + frac * 0.8)
}

function keyToY(code: string, h: number): number {
  const pos = rowOf(code)
  if (!pos) return h * (0.25 + Math.random() * 0.5)
  const bands: Record<keyof typeof ROWS, number> = { digit: 0.24, top: 0.4, home: 0.56, bottom: 0.72 }
  return h * bands[pos.row]
}
