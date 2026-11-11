import assert from 'node:assert/strict'
import { CONFIG } from '../src/config.ts'
import { observeGame } from './browser-helpers.mjs'

/** Real keyboard and pointer events, observing Phaser only from the test context. */
export async function animalPass({ browser, url, sibling, watch }) {
  for (const [touch, mood] of [[false, 'daytime'], [true, 'daytime'], [false, 'bedtime']]) {
    const context = await browser.newContext({
      viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      serviceWorkers: 'block',
      ...(touch ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
    })
    await observeGame(context)
    await context.addInitScript((mood) => {
      localStorage.setItem('toddler-smash:settings', JSON.stringify({ mode: 'smash', mood }))
    }, mood)
    const page = await context.newPage()
    watch(page)
    const warnings = []
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && /toy .*failed|recovered from (error|rejection)/.test(msg.text())) warnings.push(msg.text())
    })
    const prefix = `${touch ? 'mobile-' : ''}${mood === 'bedtime' ? 'bedtime-' : ''}animals`
    const pause = mood === 'bedtime' ? 850 : 480
    const gap = CONFIG.moods[mood].minSpawnIntervalMs + 15
    const state = () => page.evaluate(() => {
      const scene = window.__smashGame.scene.getScene('play')
      return {
        sprites: scene.pool.ring.length,
        texts: scene.text.ring.length,
        voices: scene.synth.voices,
        spawns: window.__animalSpawns.length,
        animals: scene.pool.ring.filter((img) => img.active && /^(dinosaur|shark)/.test(img.texture.key))
          .map((img) => ({ texture: img.texture.key, x: img.x, y: img.y, width: img.displayWidth, height: img.displayHeight })),
        glyphs: scene.text.ring.filter((txt) => txt.active).map((txt) => txt.text),
      }
    })
    try {
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForSelector('#splash', { state: 'detached', timeout: 10_000 })
      await page.waitForFunction(() => window.__smashGame?.scene.getScene('play')?.pool)
      await page.evaluate(() => {
        const scene = window.__smashGame.scene.getScene('play')
        window.__animalSpawns = []
        const spawn = scene.pool.spawn.bind(scene.pool)
        scene.pool.spawn = (texture, ...args) => {
          window.__animalSpawns.push(texture)
          return spawn(texture, ...args)
        }
        scene.rng.sow(['animal-play-fixture'])
      })

      if (!touch) {
        for (const [key, animal] of [['d', 'dinosaur'], ['s', 'shark']]) {
          await page.keyboard.press(key)
          await page.waitForTimeout(pause)
          const seen = await state()
          assert(seen.animals.some((img) => img.texture.startsWith(animal)), `${prefix}: ${key} summons ${animal}`)
          assert(seen.glyphs.includes(key.toUpperCase()), `${prefix}: ${key} keeps its letter`)
          assert(seen.animals.every((img) => img.texture.endsWith('-night') === (mood === 'bedtime')))
          await page.screenshot({ path: sibling(`${prefix}-${animal}`) })
        }
        await page.waitForTimeout(gap)
        await page.keyboard.down('d')
        const first = (await state()).spawns
        for (let i = 0; i < 6; i++) {
          await page.waitForTimeout(gap)
          await page.keyboard.down('d')
        }
        assert.equal((await state()).spawns, first, 'Held animal keys stay quiet')
        await page.keyboard.up('d')
      }

      // Seeded real taps exercise the ordinary weighted rotation, not keyboard shortcuts.
      const startOfTaps = (await state()).spawns
      for (let i = 0; i < 120; i++) {
        const point = touch ? [i % 2 ? 280 : 110, 400 + i % 3 * 70] : [400 + i % 3 * 160, 350 + i % 2 * 150]
        if (touch) await page.touchscreen.tap(...point)
        else await page.mouse.click(...point)
        await page.waitForTimeout(gap)
        const current = await page.evaluate((start) => window.__animalSpawns.slice(start), startOfTaps)
        if (current.some((key) => key.startsWith('dinosaur')) && current.some((key) => key.startsWith('shark'))) {
          break
        }
      }
      const records = await page.evaluate((start) => window.__animalSpawns.slice(start), startOfTaps)
      assert(records.some((key) => key.startsWith('dinosaur')), `${prefix}: tap rotation includes dinosaurs`)
      assert(records.some((key) => key.startsWith('shark')), `${prefix}: tap rotation includes sharks`)
      const before = (await state()).spawns
      if (touch) await page.touchscreen.tap(280, 490)
      else await page.keyboard.press('s')
      await page.waitForTimeout(pause)
      assert((await state()).spawns > before)
      if (touch) {
        const seen = await state()
        for (const img of seen.animals) {
          assert(img.x - img.width / 2 >= 0 && img.x + img.width / 2 <= 390, 'Phone animal fits horizontally')
          assert(img.y - img.height / 2 >= 0 && img.y + img.height / 2 <= 844, 'Phone animal fits vertically')
        }
      }
      await page.screenshot({ path: sibling(`${prefix}-play`) })

      // Sustain enough accepted input to cycle the sprite pool repeatedly.
      for (let i = 0; i < 90; i++) {
        if (touch) await page.touchscreen.tap(i % 2 ? 270 : 100, 480)
        else await page.keyboard.press(i % 2 ? 's' : 'd')
        await page.waitForTimeout(gap)
        const seen = await state()
        assert(seen.sprites <= CONFIG.limits.maxSprites)
        assert(seen.texts <= 28)
        assert(seen.voices <= CONFIG.limits.maxVoices)
      }
      assert.equal((await state()).sprites, CONFIG.limits.maxSprites)
      await page.evaluate(() => {
        const pool = window.__smashGame.scene.getScene('play').pool
        const recycled = pool.ring[pool.cursor]
        recycled.setFlip(true, true).setDepth(3)
        const next = pool.spawn('dot', 20, 20)
        if (next !== recycled || next.flipX || next.flipY || next.depth !== 0) throw new Error('Recycled animal state leaked')
      })
      await page.waitForTimeout(mood === 'bedtime' ? 8500 : 5000)
      assert.equal((await state()).animals.length, 0, 'Animal sprites retire after play')
      assert.equal((await state()).voices, 0, 'Animal voices retire after play')
      assert.deepEqual(warnings, [], 'Animal toys and audio must not fail silently')
      console.log(`ok — ${prefix}: keyboard/taps, held keys, sprite/voice caps and retirement`)
    } finally {
      await context.close()
    }
  }
}
