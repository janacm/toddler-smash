// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFIG } from './config'
import { STORAGE_KEY } from './settings'
import { hideSplash, splashCss, splashScript } from './splash'

const MOODS = Object.keys(CONFIG.moods)
const INDEX_HTML = readFileSync('index.html', 'utf8')
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')

/** Variables declared by the rule for `selector` in `splashCss()`. */
const declaredIn = (selector: string): Set<string> => {
  const rule = splashCss()
    .split('\n')
    .find((r) => r.startsWith(selector + '{'))
  return new Set([...(rule ?? '').matchAll(/(--splash-[\w-]+):/g)].map((m) => m[1]))
}

describe('splashCss', () => {
  it('declares every colour index.html uses, for every mood', () => {
    const used = new Set([...INDEX_HTML.matchAll(/var\((--splash-[\w-]+)\)/g)].map((m) => m[1]))
    expect(used.size).toBeGreaterThan(5)
    const fallback = declaredIn(':root')
    for (const name of used) expect(fallback, name).toContain(name)
    for (const mood of MOODS) {
      const vars = declaredIn(`:root[data-mood="${mood}"]`)
      for (const name of used) {
        if (name !== '--splash-fade') expect(vars, `${mood} ${name}`).toContain(name)
      }
    }
  })

  it('takes its colours and fade time from CONFIG', () => {
    const css = splashCss()
    expect(css).toContain(`--splash-fade:${CONFIG.splash.fadeMs}ms`)
    for (const [name, mood] of Object.entries(CONFIG.moods)) {
      const rule = css.split('\n').find((r) => r.startsWith(`:root[data-mood="${name}"]`))
      expect(rule).toContain(`--splash-top:${hex(mood.background.top)}`)
      expect(rule).toContain(`--splash-bottom:${hex(mood.background.bottom)}`)
      mood.palette.forEach((c, i) => expect(rule).toContain(`--splash-${i}:${hex(c)}`))
      const outline = mood.night ? hex(mood.background.top) : '#ffffff'
      expect(rule, 'outlines melt into the sky at night').toContain(`--splash-outline:${outline}`)
    }
  })

  it('uses the default mood when nothing is saved', () => {
    const daytime = CONFIG.moods.daytime.background.top
    expect(splashCss()).toMatch(new RegExp(`^:root\\{[^}]*--splash-top:${hex(daytime)}`))
  })
})

describe('splashScript', () => {
  const run = () => new Function(splashScript())()
  const mood = () => document.documentElement.getAttribute('data-mood')

  afterEach(() => {
    document.documentElement.removeAttribute('data-mood')
    document.body.innerHTML = ''
    localStorage.clear()
  })

  it.each(MOODS)('picks the saved %s mood before first paint', (name) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'piano', mood: name }))
    run()
    expect(mood()).toBe(name)
  })

  it.each([null, '{', 'null', '{"mood":"disco"}', '{"mood":"toString"}', '{"mood":["bedtime"]}'])(
    'leaves the default colours for %j',
    (stored) => {
      if (stored !== null) localStorage.setItem(STORAGE_KEY, stored)
      expect(run).not.toThrow()
      expect(mood()).toBeNull()
    },
  )

  it('bounces the logo when the child presses something', () => {
    run()
    document.body.innerHTML = '<div id="splash"></div>'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(document.getElementById('splash')?.classList).toContain('splash-boop')
  })

  it('ignores presses once the splash is gone', () => {
    run()
    expect(() => window.dispatchEvent(new PointerEvent('pointerdown'))).not.toThrow()
  })
})

describe('hideSplash', () => {
  const { minVisibleMs, fadeMs } = CONFIG.splash
  const splash = () => document.getElementById('splash')

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="splash"></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('stays up until the minimum time since page load, then fades and goes', () => {
    vi.advanceTimersByTime(minVisibleMs / 2)
    hideSplash()
    vi.advanceTimersByTime(minVisibleMs / 2 - 10)
    expect(splash()?.classList).not.toContain('splash-done')
    vi.advanceTimersByTime(10)
    expect(splash()?.classList).toContain('splash-done')
    vi.advanceTimersByTime(fadeMs)
    expect(splash()).toBeNull()
  })

  it('fades straight away after a slow load', () => {
    vi.advanceTimersByTime(minVisibleMs * 3)
    hideSplash()
    vi.advanceTimersByTime(0)
    expect(splash()?.classList).toContain('splash-done')
  })

  it.each([
    ['a key', () => new KeyboardEvent('keydown', { key: 'a' })],
    ['a tap', () => new PointerEvent('pointerdown')],
  ])('gets out of the way early for %s', (_, press) => {
    hideSplash()
    window.dispatchEvent(press())
    expect(splash()?.classList).toContain('splash-done')
    vi.advanceTimersByTime(fadeMs)
    expect(splash()).toBeNull()
    expect(() => vi.advanceTimersByTime(minVisibleMs)).not.toThrow()
  })

  it('does nothing when there is no splash', () => {
    document.body.innerHTML = ''
    expect(() => hideSplash()).not.toThrow()
  })
})
