import assert from 'node:assert/strict'
import { CONFIG } from '../src/config.ts'
import { getPuzzle } from '../src/challenges/model.ts'
import { challengeLayout, moveNode } from '../src/challenges/layout.ts'
import { holdEscape, observeGame } from './browser-helpers.mjs'

const GAMES = ['smash', 'piano', 'drawing']
const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 844 }

/** Exercise discoveries and authored puzzles through the same controls a child uses. */
export async function progressionPass({ browser, url, sibling, watch }) {
  for (const touch of [false, true]) {
    for (const game of GAMES) await gamePass(game, touch, 'daytime')
  }
  // Bedtime deliberately throttles decorative effects; logical notes must still arrive.
  await gamePass('piano', false, 'bedtime')

  async function gamePass(game, touch, mood) {
    const viewport = touch ? PHONE : DESKTOP
    const context = await browser.newContext({
      viewport,
      serviceWorkers: 'block',
      ...(touch ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
    })
    await observeGame(context)
    if (!touch && game === 'smash') {
      // A busy runner can defer the hold timer beyond a fixed 3.24s sleep.
      // Coarse ticks reproduce that case without changing the game's threshold.
      await context.addInitScript(() => {
        const interval = window.setInterval.bind(window)
        window.setInterval = (callback, delay, ...args) => interval(callback, Math.max(delay ?? 0, 1200), ...args)
      })
    }
    await context.addInitScript(({ mode, mood }) => {
      localStorage.setItem('toddler-smash:settings', JSON.stringify({ mode, mood, childCanSwitch: true }))
    }, { mode: game, mood })
    const page = await context.newPage()
    watch(page)
    const prefix = `${touch ? 'mobile-' : ''}${mood === 'bedtime' ? 'bedtime-' : ''}challenge-${game}`
    let cursor = 4

    const dimensions = () => page.viewportSize()
    const layout = () => {
      const { width, height } = dimensions()
      return challengeLayout(width, height, game)
    }
    const tap = async ({ x, y }) => {
      if (touch) await page.touchscreen.tap(x, y)
      else await page.mouse.click(x, y)
    }
    const press = async (key) => page.keyboard.press(key)
    const state = async (view, solved, currentGame = game) => {
      const expected = `Toddler Smash. ${currentGame}. ${view}. ${solved} puzzles solved.`
      await page.waitForFunction((label) => document.querySelector('canvas')?.getAttribute('aria-label') === label,
        expected, { timeout: 5000 })
      assert.equal(await page.locator('canvas').getAttribute('aria-label'), expected)
    }
    const shot = async (suffix) => {
      await page.waitForTimeout(240)
      await page.screenshot({ path: sibling(`${prefix}-${suffix}`) })
    }
    const moveTo = async (node) => {
      while (Math.floor(cursor / 3) !== Math.floor(node / 3)) {
        const direction = cursor < node ? 'ArrowDown' : 'ArrowUp'
        await press(direction)
        cursor = moveNode(cursor, direction)
      }
      while (cursor % 3 !== node % 3) {
        const direction = cursor % 3 < node % 3 ? 'ArrowRight' : 'ArrowLeft'
        await press(direction)
        cursor = moveNode(cursor, direction)
      }
    }
    const enter = async (discovered = false) => {
      cursor = 4
      for (const node of discovered ? [0] : [0, 2, 6]) {
        if (touch) await tap(layout().nodes[node])
        else {
          await moveTo(node)
          await press('Space')
        }
      }
      cursor = game === 'drawing' ? getPuzzle(game, 0).answer[0] : 4
    }
    const pianoSymbol = async (symbol) => {
      const { width, height } = dimensions()
      // Same responsive constraints as the rendered piano; symbol notes are its ends and middle.
      const { keys, minKeys, minKeyPx, gapPx } = CONFIG.piano
      const count = Math.min(keys, Math.max(minKeys, Math.floor((width * 0.92 + gapPx) / (minKeyPx + gapPx))))
      const index = [0, Math.floor((count - 1) / 2), count - 1][symbol]
      if (touch) await tap({ x: (index + 0.5) * width / count, y: height * 0.8 })
      else await press(String((index + 1) % 10))
    }
    const shape = async (symbol) => {
      if (touch) await tap(layout().choices[symbol])
      else {
        await moveTo(3 + symbol)
        await press('Space')
      }
    }
    const path = async (answer) => {
      if (touch) {
        for (const node of answer) await tap(layout().nodes[node])
      } else {
        cursor = answer[0]
        await press('Space')
        for (const node of answer.slice(1)) await moveTo(node)
      }
    }
    const dragPath = async (answer) => {
      const cdp = await context.newCDPSession(page)
      const nodes = layout().nodes
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ ...nodes[answer[0]], id: 0 }],
      })
      for (let i = 1; i < answer.length; i++) {
        const from = nodes[answer[i - 1]], to = nodes[answer[i]]
        for (let step = 1; step <= 4; step++) {
          const t = step / 4
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, id: 0 }],
          })
          await page.waitForTimeout(20)
        }
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const solve = async (solved) => {
      const puzzle = getPuzzle(game, solved)
      if (game === 'smash') for (const symbol of puzzle.answer) await shape(symbol)
      else if (game === 'piano') {
        for (const symbol of puzzle.answer) {
          if (!touch && solved === 0) {
            await moveTo(3 + symbol)
            await press('Space')
          } else await pianoSymbol(symbol)
        }
      }
      else if (touch && (solved === 2 || solved === 4)) await dragPath(puzzle.answer)
      else await path(puzzle.answer)
      await state(solved === 5 ? 'playground' : 'puzzle', solved + 1)
      cursor = game === 'drawing' ? getPuzzle(game, solved + 1).answer[0] : 4
    }
    const back = async () => {
      if (touch) await tap(layout().back)
      else await press('Backspace')
      cursor = 4
    }
    const holdPanel = () => holdEscape(page)

    try {
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForSelector('#splash', { state: 'detached', timeout: 10_000 })
      await state('free', 0)

      // A random key barrage cannot discover the firefly entrance.
      for (const key of 'ASDFZXCVQWERTY1234567890'.split('')) await press(key)
      await state('free', 0)
      await shot('entrance')
      await enter()
      await state('puzzle', 0)
      await shot('tier1')

      // Replay is reachable with either a finger or the keyboard's control row.
      if (touch) await tap(layout().replay)
      else {
        await press('Tab')
        await press('ArrowRight')
        await press('Space')
        await press('ArrowDown')
        cursor = game === 'drawing' ? getPuzzle(game, 0).answer[0] : 4
      }
      await state('puzzle', 0)

      if (game === 'smash') {
        await shape(2)
        await state('puzzle', 0)
      } else if (game === 'piano') {
        await pianoSymbol(0)
        await pianoSymbol(2)
        await pianoSymbol(1)
        await state('puzzle', 0)
      } else {
        const start = getPuzzle(game, 0).answer[0]
        if (touch) {
          await tap(layout().nodes[start])
          await tap(layout().nodes[0])
        } else {
          // Resume the crayon at the route's first waypoint after replay navigation.
          await moveTo(start)
          await press('Space')
          await press('ArrowUp')
        }
        cursor = start
        await state('puzzle', 0)
        if (touch) {
          const cdp = await context.newCDPSession(page)
          const nodes = layout().nodes
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart', touchPoints: [{ ...nodes[3], id: 0 }, { ...nodes[4], id: 1 }],
          })
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          await tap(nodes[5])
          await state('puzzle', 0)
        }
      }

      for (let solved = 0; solved < 6; solved++) {
        await solve(solved)
        if (solved === 1) await shot('tier2')
        if (solved === 3) await shot('tier3')
      }

      // Use each earned power with the input method used to solve its puzzles.
      if (game === 'smash') {
        for (let i = 0; i < 28; i++) {
          if (!touch && i < 4) {
            await moveTo(i % 9)
            await press('Space')
          } else {
            const { width, height } = dimensions()
            const point = touch ? i : i - 4
            // Distinct locations expose all 24 retained stars in the screenshot.
            await tap({ x: width * (0.16 + point % 7 * 0.11), y: height * (0.32 + Math.floor(point / 7) * 0.13) })
          }
          await page.waitForTimeout(CONFIG.moods[mood].minSpawnIntervalMs + 10)
        }
        await page.waitForTimeout(CONFIG.lifetime.shapeMs + 500)
      } else if (game === 'piano') {
        for (const note of [0, 1, 2, 0, 1, 2]) await pianoSymbol(note)
        await page.waitForTimeout(660)
      } else if (touch) {
        const cdp = await context.newCDPSession(page)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 85, y: 340, id: 0 }] })
        for (const point of [{ x: 130, y: 410 }, { x: 75, y: 490 }, { x: 160, y: 560 }]) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 0 }] })
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } else {
        for (const key of ['ArrowLeft', 'Space', 'ArrowDown', 'Space', 'ArrowRight', 'Space']) await press(key)
      }
      await state('playground', 6)
      await shot('playground')

      await back()
      await state('free', 6)
      await enter(true)
      await state('playground', 6)

      // Switching games never carries this game's challenge state into the other game.
      const other = game === 'smash' ? 'piano' : 'smash'
      const switchGame = async (name) => {
        const { width } = dimensions()
        const index = GAMES.indexOf(name)
        // These centres come from ModeSwitcher.layout; switching is pointer-only during play.
        await tap({ x: width - 26 - 46 - (GAMES.length - 1 - index) * 108, y: 26 + 46 })
      }
      await switchGame(other)
      await state('free', 0, other)
      await switchGame(game)
      await state('free', 6)
      await enter(true)
      await state('playground', 6)

      if (!touch && game === 'smash') {
        await page.setViewportSize({ width: 1100, height: 720 })
        await state('playground', 6)
        await page.setViewportSize(DESKTOP)
        await holdPanel()
        await press('b')
        await holdPanel()
        await state('playground', 6)
        await press('r')
        await state('playground', 6)
        await holdPanel()
        await press('r')
        await holdPanel()
        await state('free', 0)
        await enter()
        await state('puzzle', 0)
      }

      // A real reload clears progress even though mode and mood remain saved.
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForSelector('#splash', { state: 'detached', timeout: 10_000 })
      await state('free', 0)
    } catch (error) {
      await page.screenshot({ path: sibling(`${prefix}-failed`) }).catch(() => {})
      const label = await page.locator('canvas').getAttribute('aria-label').catch(() => 'canvas unavailable')
      throw new Error(`${prefix} failed; observed ${label}`, { cause: error })
    } finally {
      await context.close()
    }
  }
}
