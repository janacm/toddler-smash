import assert from 'node:assert/strict'
import { test } from 'node:test'
import { holdForPanel, holdEscape, waitForRenderFrame } from './browser-helpers.mjs'

test('holdForPanel succeeds when elapsed hold time satisfies holdMs - marginMs', async () => {
  let released = false
  let started = false
  const page = {
    evaluate: async () => false,
    waitForFunction: async () => {
      await new Promise((resolve) => setTimeout(resolve, 60))
    },
  }
  await holdForPanel(
    page,
    async () => {
      started = true
    },
    async () => {
      released = true
    },
    { holdMs: 50, marginMs: 10 },
  )
  assert.equal(started, true)
  assert.equal(released, true)
})

test('holdForPanel fails assertion when panel toggles before holdMs - marginMs', async () => {
  let released = false
  const page = {
    evaluate: async () => false,
    waitForFunction: async () => {},
  }
  await assert.rejects(
    holdForPanel(
      page,
      async () => {},
      async () => {
        released = true
      },
      { holdMs: 3000, marginMs: 250 },
    ),
    /expected panel hold to take at least 2750ms/,
  )
  assert.equal(released, true, 'input must be released even when assertion fails')
})

test('holdForPanel releases input if waitForFunction throws', async () => {
  let released = false
  const page = {
    evaluate: async () => false,
    waitForFunction: async () => {
      throw new Error('timeout waiting for panel')
    },
  }
  await assert.rejects(
    holdForPanel(
      page,
      async () => {},
      async () => {
        released = true
      },
      { holdMs: 10, marginMs: 5 },
    ),
    /timeout waiting for panel/,
  )
  assert.equal(released, true, 'input must be released even when waitForFunction throws')
})

test('holdEscape passes key down and key up handlers', async () => {
  const events = []
  const page = {
    keyboard: {
      down: async (key) => events.push(`down:${key}`),
      up: async (key) => events.push(`up:${key}`),
    },
    evaluate: async () => false,
    waitForFunction: async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    },
  }
  await holdEscape(page, { holdMs: 20, marginMs: 10 })
  assert.deepEqual(events, ['down:Escape', 'up:Escape'])
})

test('waitForRenderFrame evaluates a function on page', async () => {
  let evaluated = false
  const page = {
    evaluate: async (fn) => {
      evaluated = true
      assert.equal(typeof fn, 'function')
    },
  }
  await waitForRenderFrame(page)
  assert.equal(evaluated, true)
})
