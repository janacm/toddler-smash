import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { build, loadConfigFromFile } from 'vite'
import { chromium } from 'playwright'

const repo = fileURLToPath(new URL('../', import.meta.url))
await mkdir(join(repo, 'node_modules/.cache'), { recursive: true })
const temporary = await mkdtemp(join(repo, 'node_modules/.cache/update-pass-'))
const versions = new Map()
let serving = 'legacy'
let failAssets = false
let failWorker = false
let workerRequests = 0
let browser
let server

function deadline(promise, label) {
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 15_000) }),
  ]).finally(() => clearTimeout(timer))
}

try {
  // Small pages use the production registration/checker and the actual Vite PWA
  // configuration. Each build has different asset bytes and precache revisions.
  for (const name of ['legacy', 'B', 'C', 'D']) {
    const root = join(temporary, name)
    await mkdir(root)
    await writeFile(join(root, 'index.html'), '<!doctype html><html><head><title>Update check</title></head><body><script type="module" src="/entry.js"></script></body></html>')
    await writeFile(join(root, 'entry.js'), `
      import { BUILD_ID } from 'app-version';
      ${name === 'legacy'
        ? "import { registerSW } from 'virtual:pwa-register'; registerSW({ immediate: true });"
        : "import { startWebUpdates } from 'app-web-updates'; startWebUpdates();"}
      document.documentElement.dataset.fixture = ${JSON.stringify(name)};
      document.documentElement.dataset.buildId = BUILD_ID;
      document.body.append(${JSON.stringify(name)});
    `)
    const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, join(repo, 'vite.config.ts'))
    assert.ok(loaded)
    await build({
      ...loaded.config,
      configFile: false,
      root,
      publicDir: join(repo, 'public'),
      logLevel: 'silent',
      resolve: { alias: { 'app-version': join(repo, 'src/version.ts'), 'app-web-updates': join(repo, 'src/webUpdates.ts') } },
      build: { ...loaded.config.build, outDir: join(root, 'dist'), emptyOutDir: true },
    })
    const dist = join(root, 'dist')
    const worker = await readFile(join(dist, 'sw.js'), 'utf8')
    assert.match(worker, /self\.skipWaiting\(\)/)
    assert.match(worker, /\w+\.clientsClaim\(\)/)
    assert.ok(!worker.includes('version.json'), 'diagnostic version must not be precached')
    if (name === 'legacy') {
      // Reproduce the deployed waiting-worker bug and its original registration
      // code, without depending on a network download or an old git checkout.
      await writeFile(join(dist, 'sw.js'), worker
        .replace('self.skipWaiting(),', '')
        .replace(/\w+\.clientsClaim\(\),/, ''))
      const legacy = await readFile(join(dist, 'sw.js'), 'utf8')
      assert.ok(!legacy.includes('skipWaiting()') && !legacy.includes('clientsClaim()'))
    }
    versions.set(name, dist)
  }

  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' }
  server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname
    if (path === '/sw.js') workerRequests++
    if (path === '/sw.js' && failWorker) { response.writeHead(503).end('worker temporarily unavailable'); return }
    if (failAssets && path.startsWith('/assets/')) {
      response.writeHead(503).end('incomplete deployment fixture')
      return
    }
    const relative = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1))
    const file = resolve(versions.get(serving), relative)
    if (!file.startsWith(versions.get(serving) + '/')) { response.writeHead(403).end(); return }
    try {
      const data = await readFile(file)
      const extension = file.slice(file.lastIndexOf('.'))
      response.writeHead(200, { 'Content-Type': mime[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
      response.end(data)
    } catch { response.writeHead(404).end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch()
  const settings = JSON.stringify({ mode: 'drawing', mood: 'bedtime', childCanSwitch: false })
  const problems = []
  let expectedNetworkFailure = false

  async function open() {
    const context = await browser.newContext({ serviceWorkers: 'allow' })
    const page = await context.newPage()
    let navigations = 0
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++ })
    page.on('pageerror', error => problems.push(String(error)))
    page.on('console', message => {
      if (message.type() === 'error' && !expectedNetworkFailure) problems.push(message.text())
    })
    await page.clock.install()
    await page.goto(url)
    await page.waitForFunction(() => document.documentElement.dataset.fixture)
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    return { context, page, navigations: () => navigations }
  }
  async function current(page, name) {
    await page.waitForFunction(expected => document.documentElement.dataset.fixture === expected, name, { timeout: 15_000 })
    const remote = JSON.parse(await readFile(join(versions.get(name), 'version.json'), 'utf8'))
    assert.equal(await page.evaluate(() => document.documentElement.dataset.buildId), remote.buildId)
  }
  async function stable(page, navigations, expected) {
    await page.clock.fastForward(180_001)
    await sleep(250)
    assert.equal(navigations(), expected, 'one reload per update; no reload loop')
  }

  // An installation using the old worker and old registration code migrates
  // when its browser next checks, without unregistering or deleting caches.
  const migration = await open()
  await sleep(250)
  assert.equal(migration.navigations(), 1, 'first install must not reload')
  await migration.page.reload()
  await migration.page.waitForFunction(() => navigator.serviceWorker.controller)
  await migration.page.evaluate(value => localStorage.setItem('toddler-smash:settings', value), settings)
  serving = 'B'
  const beforeMigration = migration.navigations()
  await migration.page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update() })
  await current(migration.page, 'B')
  const diagnostic = await migration.context.newPage()
  const diagnosticResponse = await diagnostic.goto(`${url}/version.json`)
  assert.equal(diagnosticResponse.headers()['content-type'], 'application/json')
  assert.equal(JSON.parse(await diagnostic.locator('body').innerText()).buildId,
    JSON.parse(await readFile(join(versions.get('B'), 'version.json'), 'utf8')).buildId)
  await diagnostic.close()
  assert.equal(await migration.page.evaluate(() => localStorage.getItem('toddler-smash:settings')), settings)
  await stable(migration.page, migration.navigations, beforeMigration + 1)
  console.log('ok — legacy cache migrates automatically on its next worker check; settings retained')

  serving = 'C'
  const beforePeriodic = migration.navigations()
  await migration.page.clock.fastForward(60_001)
  await current(migration.page, 'C')
  await stable(migration.page, migration.navigations, beforePeriodic + 1)
  console.log('ok — next deployment installs during play on the 60-second timer')
  await migration.context.close()

  serving = 'B'
  const live = await open()
  await live.page.waitForFunction(() => navigator.serviceWorker.controller)
  await stable(live.page, live.navigations, 1)
  const beforeVisible = live.navigations()
  await live.page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }))
  serving = 'C'
  const beforeHidden = workerRequests
  await live.page.clock.fastForward(60_001)
  await sleep(150)
  assert.equal(workerRequests, beforeHidden, 'hidden tabs do not poll')
  await live.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await current(live.page, 'C')
  await stable(live.page, live.navigations, beforeVisible + 1)
  console.log('ok — returning to the foreground checks immediately')

  serving = 'B'
  await live.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  await current(live.page, 'B')
  console.log('ok — restored navigation checks immediately')

  await live.context.setOffline(true)
  await live.page.reload()
  await current(live.page, 'B')
  const beforeOnline = live.navigations()
  serving = 'C'
  await live.context.setOffline(false)
  await current(live.page, 'C')
  await stable(live.page, live.navigations, beforeOnline + 1)
  console.log('ok — offline startup plays its complete cache and reconnect installs the release')

  expectedNetworkFailure = true
  serving = 'D'
  failAssets = true
  const beforeFailure = live.navigations()
  // Observe the real worker install failure, not just an HTTP request failing.
  const failed = await deadline(live.page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration()
    return new Promise(resolve => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker.addEventListener('statechange', () => { if (worker.state === 'redundant') resolve(true) })
      }, { once: true })
      window.dispatchEvent(new Event('online'))
    })
  }), 'failed worker installation')
  assert.equal(failed, true)
  await current(live.page, 'C')
  assert.equal(live.navigations(), beforeFailure, 'incomplete downloads must not reload')
  failAssets = false
  expectedNetworkFailure = false
  // Let the failed update promise settle; the next scheduled check is a retry,
  // rather than another event coalesced into the still-finishing request.
  await sleep(200)
  await live.page.clock.fastForward(60_001)
  await current(live.page, 'D')
  await stable(live.page, live.navigations, beforeFailure + 1)
  console.log('ok — failed precache keeps the old game; a later successful retry updates once')
  await live.context.close()

  // Registration itself may fail before the helper can provide a registration.
  // Retry scheduling must exist even in that case.
  serving = 'B'
  failWorker = true
  expectedNetworkFailure = true
  const retryContext = await browser.newContext({ serviceWorkers: 'allow' })
  const retryPage = await retryContext.newPage()
  let retryNavigations = 0
  retryPage.on('framenavigated', frame => { if (frame === retryPage.mainFrame()) retryNavigations++ })
  retryPage.on('pageerror', error => problems.push(String(error)))
  await retryPage.clock.install()
  const beforeRegistration = workerRequests
  await retryPage.goto(url)
  await current(retryPage, 'B')
  await deadline((async () => { while (workerRequests === beforeRegistration) await sleep(20) })(), 'initial registration request')
  await sleep(200)
  assert.equal(await retryPage.evaluate(() => navigator.serviceWorker.controller), null)
  failWorker = false
  expectedNetworkFailure = false
  await retryPage.clock.fastForward(60_001)
  await deadline(retryPage.evaluate(async () => { await navigator.serviceWorker.ready }), 'registration retry')
  await retryPage.waitForFunction(() => navigator.serviceWorker.controller)
  assert.equal(retryNavigations, 1, 'successful first install after a registration failure must not reload')
  console.log('ok — initial registration failure retries without disrupting play')
  await retryContext.close()
  assert.deepEqual(problems, [], 'no unexpected browser errors')
  console.log('ok — all cached-installation update checks passed')
} finally {
  await browser?.close()
  if (server) await new Promise(resolve => server.close(resolve))
  await rm(temporary, { recursive: true, force: true })
}
