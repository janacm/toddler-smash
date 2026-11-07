/**
 * Boot the built game in headless Chromium, mash it, and save a screenshot.
 *
 * This is the verification half of the harness. A coding agent cannot tell
 * whether a visual change worked by reading the diff — it has to look. Run:
 *
 *   npm run build && npm run shot
 *
 * Output lands in shots/ (gitignored).
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { progressionPass } from './progression-pass.mjs'
import { animalPass } from './animal-pass.mjs'
import { holdEscape as holdEscapeOn, holdForPanel, observeGame } from './browser-helpers.mjs'

// Not vite's default 4173, which other copies of the game may already be
// serving. --strictPort below makes a clash fail instead of silently
// screenshotting someone else's server.
const PORT = Number(process.env.PORT) || 4391
const URL = `http://127.0.0.1:${PORT}/`
const OUT = process.argv[2] ?? 'shots/latest.png'

mkdirSync(dirname(OUT), { recursive: true })

/** shots/latest.png -> shots/piano.png, next to the main screenshot. */
function sibling(name) {
  return join(dirname(OUT), `${name}.png`)
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
  detached: false,
})
let serverExited = false
server.on('exit', () => {
  serverExited = true
})

const shutdown = () => {
  try {
    server.kill('SIGTERM')
  } catch {
    /* already gone */
  }
}
process.on('exit', shutdown)
process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})

let browser
try {
  await waitForServer(URL, 15_000)

  browser = await chromium.launch(findChromium())
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await observeGame(page.context())

  const problems = []
  const watch = (p) => {
    p.on('pageerror', (err) => problems.push(String(err)))
    p.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(msg.text())
    })
  }
  watch(page)

  await splashPass()

  await page.goto(URL, { waitUntil: 'networkidle' })
  await splashGone(page)

  // Mash it the way the actual user will: fast, arbitrary, overlapping.
  const keys = 'HELLO2468WORLD'.repeat(3).split('')
  for (const k of keys) {
    await page.keyboard.press(k)
    await sleep(18)
  }
  await page.mouse.click(400, 300)
  await page.mouse.click(900, 500)
  await sleep(700)

  await page.screenshot({ path: OUT })

  // The child's buttons sit top-right, 108px apart, in `MODES` order: smash,
  // piano, drawing. Bump MODE_COUNT when a sub-game is added.
  const MODE_COUNT = 3
  const button = (i, w) => [w - 26 - 46 - (MODE_COUNT - 1 - i) * 108, 26 + 46]

  // Tap the piano button and play across it.
  await page.mouse.click(...button(1, 1280))
  await sleep(600)
  for (const k of '13579QWERTY0'.split('')) {
    await page.keyboard.press(k)
    await sleep(70)
  }
  await page.mouse.click(300, 650)
  await sleep(500)
  await page.screenshot({ path: sibling('piano') })

  // Drawing: a few mouse scribbles, then keys for stickers. A second shot a
  // few seconds later checks the drawing fades.
  await page.mouse.click(...button(2, 1280))
  await sleep(400)
  const scribble = async (points) => {
    await page.mouse.move(...points[0])
    await page.mouse.down()
    for (const p of points.slice(1)) await page.mouse.move(...p, { steps: 12 })
    await page.mouse.up()
  }
  await scribble([[150, 600], [350, 250], [550, 600], [750, 250], [950, 600]])
  await scribble([[200, 400], [640, 700], [1100, 350]])
  for (const k of 'CAT7'.split('')) {
    await page.keyboard.press(k)
    await sleep(120)
  }
  await page.keyboard.press('Space')
  await sleep(600)
  await page.screenshot({ path: sibling('drawing') })
  await sleep(6000)
  await page.screenshot({ path: sibling('drawing-faded') })

  // Grown-up panel: hold Escape, switch to Bedtime + Smash, hide it, mash.
  await holdEscape()
  await page.screenshot({ path: sibling('panel') })
  await page.keyboard.press('b')
  await page.keyboard.press('1')
  await sleep(300)
  await holdEscape()
  for (const k of 'GOODNIGHT'.split('')) {
    await page.keyboard.press(k)
    await sleep(180)
  }
  await page.mouse.click(640, 400)
  await sleep(900)
  await page.screenshot({ path: sibling('bedtime') })

  await mobilePass()
  // The baseline page is finished; stop rendering it during the later passes.
  await page.close()
  await animalPass({ browser, url: URL, sibling, watch })
  await progressionPass({ browser, url: URL, sibling, watch })

  /**
   * A phone-sized touch screen: tap around, switch to piano with the corner
   * button, then open the grown-up panel with the two-finger corner hold.
   */
  async function mobilePass() {
    const W = 390
    const H = 844
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    await observeGame(context)
    const phone = await context.newPage()
    watch(phone)
    await phone.goto(URL, { waitUntil: 'networkidle' })
    await splashGone(phone)

    for (const [x, y] of [[120, 300], [260, 420], [200, 600], [90, 520]]) {
      await phone.touchscreen.tap(x, y)
      await sleep(120)
    }
    await sleep(500)
    await phone.screenshot({ path: sibling('mobile') })

    await phone.touchscreen.tap(...button(1, W))
    await sleep(700)
    for (let i = 0; i < 5; i++) {
      await phone.touchscreen.tap(40 + i * 75, 700)
      await sleep(110)
    }
    await sleep(400)
    await phone.screenshot({ path: sibling('mobile-piano') })

    // Drawing with two fingers at once.
    const cdp = await context.newCDPSession(phone)
    await phone.touchscreen.tap(...button(2, W))
    await sleep(500)
    const fingers = (t) => [
      { x: 60 + t * 270, y: 250 + Math.sin(t * 9) * 80, id: 0 },
      { x: 330 - t * 270, y: 600 + Math.cos(t * 7) * 90, id: 1 },
    ]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(0) })
    for (let i = 1; i <= 30; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(i / 30) })
      await sleep(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(400)
    await phone.screenshot({ path: sibling('mobile-drawing') })

    const holdCorners = async () => {
      await holdForPanel(phone, () => cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: 12, y: 12, id: 0 },
          { x: W - 12, y: H - 12, id: 1 },
        ],
      }), () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }))
    }
    await holdCorners()
    await phone.screenshot({ path: sibling('mobile-panel') })

    await context.close()
  }

  /**
   * The loading splash, held on screen by stalling the game bundle: Daytime,
   * Bedtime (the saved mood must be picked before first paint), and a phone.
   * Each then lets the game load and checks the splash takes itself down.
   */
  async function splashPass() {
    const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    await splashShot('splash', { viewport: { width: 1280, height: 800 } })
    await splashShot('splash-bedtime', { viewport: { width: 1280, height: 800 } }, 'bedtime')
    await splashShot('mobile-splash', phone)
  }

  async function splashShot(name, options, mood) {
    const context = await browser.newContext({ ...options, serviceWorkers: 'block' })
    if (mood) {
      await context.addInitScript((m) => localStorage.setItem('toddler-smash:settings', JSON.stringify({ mood: m })), mood)
    }
    const p = await context.newPage()
    watch(p)
    let release
    const stalled = new Promise((resolve) => (release = resolve))
    await p.route('**/assets/*.js', async (route) => {
      await stalled
      await route.continue()
    })
    await p.goto(URL, { waitUntil: 'commit' })
    await p.waitForSelector('#splash')
    await sleep(900)
    await p.screenshot({ path: sibling(name) })
    release()
    await splashGone(p)
    await context.close()
  }

  async function splashGone(p) {
    await p.waitForSelector('#splash', { state: 'detached', timeout: 10_000 })
    await sleep(200)
  }

  async function holdEscape() {
    await holdEscapeOn(page)
  }

  if (problems.length) {
    console.error('page reported problems:')
    for (const p of problems) console.error('  -', p)
    process.exitCode = 1
  } else {
    const names = ['splash', 'splash-bedtime', 'mobile-splash', 'piano', 'drawing', 'drawing-faded', 'panel', 'bedtime', 'mobile', 'mobile-piano', 'mobile-drawing', 'mobile-panel']
    console.log(`ok — no page errors. screenshots: ${[OUT, ...names.map(sibling)].join(', ')}`)
  }
} finally {
  await browser?.close()
  shutdown()
}

/**
 * Prefer whatever Playwright resolves on its own. If the bundled browser
 * revision doesn't match this Playwright version, fall back to any chromium
 * build present under PLAYWRIGHT_BROWSERS_PATH rather than downloading one.
 */
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return {}

  // executablePath() returns a path whether or not it exists, so check it.
  try {
    const pinned = chromium.executablePath()
    if (pinned && existsSync(pinned)) return {}
  } catch {
    /* fall through to the manual search */
  }

  const candidate = readdirSync(root)
    .filter((d) => d.startsWith('chromium-'))
    .map((d) => join(root, d, 'chrome-linux', 'chrome'))
    .find((p) => existsSync(p))

  return candidate ? { executablePath: candidate } : {}
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (serverExited) throw new Error(`preview server exited; is port ${PORT} already in use?`)
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error(`preview server did not start at ${url}`)
}
