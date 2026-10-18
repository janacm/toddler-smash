import { CONFIG, type Mood } from './config'
import { parseSettings, STORAGE_KEY } from './settings'

/**
 * The loading splash: the animated logo and spinner in `index.html`, shown
 * while the Phaser bundle downloads. Its markup and animation are plain
 * HTML/CSS there so they paint before any of the game's JavaScript arrives.
 *
 * This module supplies the two things index.html can't know on its own (the
 * vite.config.ts plugin injects both into <head>), and takes the splash down
 * once the game is ready.
 */

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0')

function moodVars(mood: Mood): string {
  return [
    `--splash-top:${hex(mood.background.top)}`,
    `--splash-bottom:${hex(mood.background.bottom)}`,
    // White sticker outlines by day; at night they'd glow, so they melt into the sky.
    `--splash-outline:${mood.night ? hex(mood.background.top) : '#ffffff'}`,
    ...mood.palette.map((c, i) => `--splash-${i}:${hex(c)}`),
  ].join(';')
}

/** Splash colours as CSS variables, one rule per mood, from `CONFIG.moods`. */
export function splashCss(): string {
  const fallback = CONFIG.moods[parseSettings(null).mood]
  const rules = [`:root{--splash-fade:${CONFIG.splash.fadeMs}ms;${moodVars(fallback)}}`]
  for (const [name, mood] of Object.entries(CONFIG.moods)) {
    rules.push(`:root[data-mood="${name}"]{${moodVars(mood)}}`)
  }
  return rules.join('\n')
}

/**
 * An inline script for <head>. It runs before the first paint, so it:
 *  - picks the saved mood, so Bedtime never flashes a bright splash;
 *  - makes the logo bounce when the child presses something during loading,
 *    because every press should do something visible.
 */
export function splashScript(): string {
  return `(function () {
  try {
    var mood = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}) || '{}').mood
    if (${JSON.stringify(Object.keys(CONFIG.moods))}.indexOf(mood) >= 0) {
      document.documentElement.setAttribute('data-mood', mood)
    }
  } catch (e) {}
  function boop() {
    var splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.remove('splash-boop')
    void splash.offsetWidth
    splash.classList.add('splash-boop')
  }
  addEventListener('keydown', boop)
  addEventListener('pointerdown', boop)
})()`
}

/**
 * Fade the splash out and remove it. Call once the game has drawn. It waits
 * until `CONFIG.splash.minVisibleMs` after page load, unless the child
 * presses something first.
 */
export function hideSplash(): void {
  const splash = document.getElementById('splash')
  if (!splash) return
  const { minVisibleMs, fadeMs } = CONFIG.splash

  const go = () => {
    window.clearTimeout(timer)
    window.removeEventListener('keydown', go)
    window.removeEventListener('pointerdown', go)
    splash.classList.add('splash-done')
    window.setTimeout(() => splash.remove(), fadeMs)
  }
  const timer = window.setTimeout(go, Math.max(0, minVisibleMs - performance.now()))
  window.addEventListener('keydown', go)
  window.addEventListener('pointerdown', go)
}
