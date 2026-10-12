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

// Not vite's default 4173, which other copies of the game may already be
// serving. --strictPort below makes a clash fail instead of silently
// screenshotting someone else's server.
const PORT = 4391
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

try {
  await waitForServer(URL, 15_000)

  const browser = await chromium.launch(findChromium())
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  const problems = []
  page.on('pageerror', (err) => problems.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text())
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await sleep(600)

  // Mash it the way the actual user will: fast, arbitrary, overlapping.
  const keys = 'HELLO2468WORLD'.split('')
  for (const k of keys) {
    await page.keyboard.press(k)
    await sleep(55)
  }
  await page.mouse.click(400, 300)
  await page.mouse.click(900, 500)
  await sleep(700)

  await page.screenshot({ path: OUT })

  // Tap the child's piano button (second of two in the top-right corner)
  // and play across it.
  await page.mouse.click(1280 - 26 - 46, 26 + 46)
  await sleep(600)
  for (const k of '13579QWERTY0'.split('')) {
    await page.keyboard.press(k)
    await sleep(70)
  }
  await page.mouse.click(300, 650)
  await sleep(500)
  await page.screenshot({ path: sibling('piano') })

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

  await browser.close()

  async function holdEscape() {
    await page.keyboard.down('Escape')
    await sleep(3300)
    await page.keyboard.up('Escape')
    await sleep(200)
  }

  if (problems.length) {
    console.error('page reported problems:')
    for (const p of problems) console.error('  -', p)
    process.exitCode = 1
  } else {
    console.log(`ok — no page errors. screenshots: ${[OUT, ...['piano', 'panel', 'bedtime'].map(sibling)].join(', ')}`)
  }
} finally {
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
