import assert from 'node:assert/strict'

/** Observe the running scene from browser tests without a production debug API. */
export async function observeGame(context) {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'Phaser', {
      configurable: true,
      set(value) {
        Object.defineProperty(window, 'Phaser', { configurable: true, writable: true, value })
        const OriginalGame = value.Game
        value.Game = class extends OriginalGame {
          constructor(...args) {
            super(...args)
            window.__smashGame = this
          }
        }
      },
    })
  })
}

/**
 * Keep the real input held until its timer actually changes the panel.
 * Asserts that the elapsed wall-clock time between start() and panel.visible
 * toggling is at least holdMs minus a small tolerance margin.
 */
export async function holdForPanel(page, start, release, options = {}) {
  const opts = typeof options === 'number' ? { holdMs: options } : options
  const holdMs = opts.holdMs ?? 3000
  const marginMs = opts.marginMs ?? opts.toleranceMs ?? opts.toleranceMargin ?? 250

  const before = await page.evaluate(() => window.__smashGame.scene.getScene('play').panel.visible)
  const startedAt = Date.now()
  await start()
  let elapsedMs
  try {
    await page.waitForFunction(
      (previous) => window.__smashGame.scene.getScene('play').panel.visible !== previous,
      before,
      { timeout: 15_000, polling: 100 },
    )
    elapsedMs = Date.now() - startedAt
  } finally {
    await release()
  }
  assert(
    elapsedMs >= holdMs - marginMs,
    `expected panel hold to take at least ${holdMs - marginMs}ms, took ${elapsedMs}ms`,
  )
}

export async function holdEscape(page, options) {
  await holdForPanel(page, () => page.keyboard.down('Escape'), () => page.keyboard.up('Escape'), options)
}

/** Wait for at least one requestAnimationFrame before capturing rendered changes. */
export async function waitForRenderFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))
}

