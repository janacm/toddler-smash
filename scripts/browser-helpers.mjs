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

/** Keep the real input held until its timer actually changes the panel. */
export async function holdForPanel(page, start, release) {
  const before = await page.evaluate(() => window.__smashGame.scene.getScene('play').panel.visible)
  await start()
  try {
    await page.waitForFunction((previous) => window.__smashGame.scene.getScene('play').panel.visible !== previous,
      before, { timeout: 15_000, polling: 100 })
  } finally {
    await release()
  }
}

export async function holdEscape(page) {
  await holdForPanel(page, () => page.keyboard.down('Escape'), () => page.keyboard.up('Escape'))
}
