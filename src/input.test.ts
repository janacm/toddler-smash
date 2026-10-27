// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from './config'
import { installInput, type InputHooks } from './input'
import { currentMood, settings } from './settings'

let hooks: { [K in keyof Required<InputHooks>]: ReturnType<typeof vi.fn> }
let parent: HTMLElement
let uninstall: () => void

const HOLD = CONFIG.parentEscape.holdMs
/** Long enough that the spawn rate limit never drops the next event. */
const GAP = currentMood().minSpawnIntervalMs + 1

const key = (type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent(type, { key, cancelable: true, ...init })
  window.dispatchEvent(ev)
  return ev
}

const pointer = (type: string, pointerId: number, clientX: number, clientY: number, target: EventTarget = window) => {
  const ev = new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
  return ev
}

const smashes = () => hooks.onSmash.mock.calls.map(([e]) => e)
const actions = () => hooks.onAction.mock.calls.map(([action]) => action)

beforeEach(() => {
  vi.useFakeTimers()
  vi.advanceTimersByTime(1000)
  hooks = { onAction: vi.fn(() => false), onSmash: vi.fn(), onStroke: vi.fn(), onParentEscape: vi.fn() }
  parent = document.createElement('div')
  document.body.appendChild(parent)
  uninstall = installInput(parent, hooks as unknown as InputHooks)
})

afterEach(() => {
  uninstall()
  parent.remove()
  settings.mood = 'daytime'
  vi.useRealTimers()
})

describe('keyboard', () => {
  it('turns a letter into a smash', () => {
    key('keydown', 'a', { code: 'KeyA' })
    expect(smashes()).toEqual([
      expect.objectContaining({ char: 'A', isLetter: true, isDigit: false, source: 'key', index: 0 }),
    ])
  })

  it('marks digits and blanks out non-printable keys', () => {
    key('keydown', '7', { code: 'Digit7' })
    vi.advanceTimersByTime(GAP)
    key('keydown', 'Shift', { code: 'ShiftLeft' })
    vi.advanceTimersByTime(GAP)
    key('keydown', '!', { code: 'Digit1' })
    expect(smashes().map((e) => [e.char, e.isDigit, e.isLetter])).toEqual([
      ['7', true, false],
      ['', false, false],
      ['', false, false],
    ])
  })

  it('places keys roughly where they sit on the keyboard', () => {
    for (const code of ['KeyQ', 'KeyP', 'Digit1', 'KeyZ']) {
      key('keydown', code.slice(-1), { code })
      vi.advanceTimersByTime(GAP)
    }
    const [q, p, one, z] = smashes()
    expect(q.x).toBeLessThan(p.x)
    expect(q.y).toBe(p.y)
    expect(one.y).toBeLessThan(q.y)
    expect(z.y).toBeGreaterThan(q.y)
    for (const e of smashes()) {
      expect(e.x).toBeGreaterThan(0)
      expect(e.x).toBeLessThan(window.innerWidth)
    }
  })

  it('puts unknown keys somewhere on screen', () => {
    key('keydown', 'F7', { code: 'F7' })
    const [e] = smashes()
    expect(e.x).toBeGreaterThan(0)
    expect(e.x).toBeLessThan(window.innerWidth)
    expect(e.y).toBeGreaterThan(0)
    expect(e.y).toBeLessThan(window.innerHeight)
  })

  it('ignores held-key repeats but still swallows them', () => {
    key('keydown', 'a', { code: 'KeyA' })
    vi.advanceTimersByTime(GAP)
    const repeat = key('keydown', 'a', { code: 'KeyA', repeat: true })
    expect(hooks.onSmash).toHaveBeenCalledOnce()
    expect(hooks.onAction).toHaveBeenCalledOnce()
    expect(repeat.defaultPrevented).toBe(true)
  })

  it('rate-limits a burst of different keys', () => {
    key('keydown', 'a', { code: 'KeyA' })
    key('keydown', 's', { code: 'KeyS' })
    key('keydown', 'd', { code: 'KeyD' })
    expect(hooks.onSmash).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(GAP)
    key('keydown', 'f', { code: 'KeyF' })
    expect(smashes().map((e) => e.index)).toEqual([0, 3])
  })

  it.each(['F5', 'Tab', ' ', '/', "'", 'Backspace'])('swallows browser shortcut %j', (k) => {
    expect(key('keydown', k).defaultPrevented).toBe(true)
  })

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])(
    'lets modifier combos through in a browser: %j',
    (mods) => {
      expect(key('keydown', 'w', { code: 'KeyW', ...mods }).defaultPrevented).toBe(false)
      expect(hooks.onAction).not.toHaveBeenCalled()
      expect(hooks.onSmash).toHaveBeenCalledOnce()
    },
  )

  it('blocks the context menu', () => {
    const ev = new MouseEvent('contextmenu', { cancelable: true })
    window.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})

describe('logical play actions', () => {
  it('delivers every rapid navigation press before Bedtime cosmetic rate limiting', () => {
    settings.mood = 'bedtime'
    const presses = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', ' ', 'Enter', 'Backspace']
    for (const k of presses) {
      key('keydown', k)
      vi.advanceTimersByTime(10)
    }
    expect(actions().map((action) => action.key)).toEqual(presses)
    expect(actions().map((action) => action.event.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(hooks.onSmash).toHaveBeenCalledOnce()
  })

  it('consumed actions do not spawn toys or throttle the next ordinary smash', () => {
    hooks.onAction.mockReturnValueOnce(true)
    key('keydown', 'Enter')
    key('keydown', 'a', { code: 'KeyA' })
    expect(actions()).toHaveLength(2)
    expect(smashes()).toEqual([expect.objectContaining({ char: 'A', index: 1 })])
  })

  it('supplies original keys alongside normalized letters', () => {
    key('keydown', 'a', { code: 'KeyA' })
    expect(actions()).toEqual([
      { key: 'a', event: expect.objectContaining({ char: 'A', isLetter: true, source: 'key' }) },
    ])
  })

  it('delivers simultaneous fingers even when ordinary visuals are capped', () => {
    pointer('pointerdown', 3, 120, 340, parent)
    pointer('pointerdown', 4, 220, 440, parent)
    expect(actions()).toEqual([
      { key: undefined, event: expect.objectContaining({ pointerId: 3, x: 120, y: 340, source: 'pointer' }) },
      { key: undefined, event: expect.objectContaining({ pointerId: 4, x: 220, y: 440, source: 'pointer' }) },
    ])
    expect(hooks.onSmash).toHaveBeenCalledOnce()
  })

  it('keeps working when no logical action hook is installed', () => {
    uninstall()
    uninstall = installInput(parent, {
      onSmash: hooks.onSmash,
      onStroke: hooks.onStroke,
      onParentEscape: hooks.onParentEscape,
    })
    key('keydown', 'a', { code: 'KeyA' })
    expect(hooks.onSmash).toHaveBeenCalledOnce()
    expect(hooks.onAction).not.toHaveBeenCalled()
  })
})

describe('grown-up Escape hold', () => {
  it('opens the panel after holding Escape, without smashing', () => {
    expect(key('keydown', 'Escape').defaultPrevented).toBe(true)
    vi.advanceTimersByTime(HOLD - 200)
    expect(hooks.onParentEscape).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(hooks.onParentEscape).toHaveBeenCalledOnce()
    expect(hooks.onSmash).not.toHaveBeenCalled()
    expect(hooks.onAction).not.toHaveBeenCalled()
  })

  it('times from the first press, not from repeats', () => {
    key('keydown', 'Escape')
    for (let t = 0; t < HOLD; t += 500) {
      vi.advanceTimersByTime(500)
      key('keydown', 'Escape', { repeat: true })
    }
    vi.advanceTimersByTime(200)
    expect(hooks.onParentEscape).toHaveBeenCalledOnce()
  })

  it('does nothing if Escape is released early', () => {
    key('keydown', 'Escape')
    vi.advanceTimersByTime(HOLD - 500)
    key('keyup', 'Escape')
    vi.advanceTimersByTime(HOLD)
    expect(hooks.onParentEscape).not.toHaveBeenCalled()
  })

  it('is cancelled when the window loses focus', () => {
    key('keydown', 'Escape')
    window.dispatchEvent(new Event('blur'))
    vi.advanceTimersByTime(HOLD * 2)
    expect(hooks.onParentEscape).not.toHaveBeenCalled()
  })
})

describe('pointer', () => {
  it('smashes where the finger lands and swallows the touch', () => {
    const ev = pointer('pointerdown', 3, 120, 340, parent)
    expect(ev.defaultPrevented).toBe(true)
    expect(smashes()).toEqual([expect.objectContaining({ x: 120, y: 340, char: '', source: 'pointer', pointerId: 3 })])
  })

  it('streams moves and the lift for a finger that is down', () => {
    pointer('pointerdown', 1, 10, 10, parent)
    pointer('pointermove', 1, 20, 30)
    pointer('pointerup', 1, 25, 35)
    expect(hooks.onStroke.mock.calls.map(([e]) => e)).toEqual([
      { pointerId: 1, x: 20, y: 30, phase: 'move' },
      { pointerId: 1, x: 25, y: 35, phase: 'end' },
    ])
  })

  it('ignores hovering and lifting a pointer that never went down', () => {
    pointer('pointermove', 9, 20, 30)
    pointer('pointerup', 9, 20, 30)
    pointer('pointercancel', 9, 20, 30)
    expect(hooks.onStroke).not.toHaveBeenCalled()
  })

  it('ends every stroke when the window loses focus', () => {
    pointer('pointerdown', 1, 10, 10, parent)
    pointer('pointerdown', 2, 50, 50, parent)
    window.dispatchEvent(new Event('blur'))
    expect(hooks.onStroke.mock.calls.map(([e]) => [e.pointerId, e.phase])).toEqual([
      [1, 'end'],
      [2, 'end'],
    ])
  })
})

describe('grown-up corner hold', () => {
  const holdCorners = () => {
    pointer('pointerdown', 1, 2, 2, parent)
    pointer('pointerdown', 2, window.innerWidth - 2, window.innerHeight - 2, parent)
  }

  it('opens the panel once, however long the corners are held', () => {
    holdCorners()
    vi.advanceTimersByTime(HOLD + 200)
    expect(hooks.onParentEscape).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(HOLD * 3)
    expect(hooks.onParentEscape).toHaveBeenCalledOnce()
  })

  it('can open again after letting go', () => {
    holdCorners()
    vi.advanceTimersByTime(HOLD + 200)
    pointer('pointerup', 1, 2, 2)
    pointer('pointerup', 2, window.innerWidth - 2, window.innerHeight - 2)
    holdCorners()
    vi.advanceTimersByTime(HOLD + 200)
    expect(hooks.onParentEscape).toHaveBeenCalledTimes(2)
  })

  it('does nothing if a finger slides out of its corner', () => {
    holdCorners()
    vi.advanceTimersByTime(HOLD / 2)
    pointer('pointermove', 1, window.innerWidth / 2, window.innerHeight / 2)
    vi.advanceTimersByTime(HOLD)
    expect(hooks.onParentEscape).not.toHaveBeenCalled()
  })
})

it('stops listening once uninstalled', () => {
  uninstall()
  key('keydown', 'a', { code: 'KeyA' })
  pointer('pointerdown', 1, 10, 10, parent)
  key('keydown', 'Escape')
  vi.advanceTimersByTime(HOLD * 2)
  expect(hooks.onSmash).not.toHaveBeenCalled()
  expect(hooks.onAction).not.toHaveBeenCalled()
  expect(hooks.onParentEscape).not.toHaveBeenCalled()
  uninstall = () => {}
})
