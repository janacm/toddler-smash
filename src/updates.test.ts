// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reloadOnce, UPDATE_INTERVAL_MS, watchForUpdates } from './updates'

let stop: (() => void) | undefined
let visible = true
let online = true
const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
  visible = online = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
})
afterEach(() => {
  stop?.()
  stop = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('watchForUpdates', () => {
  it('checks on registration and every minute, without requiring interaction', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await flush()
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS - 1)
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(update).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(3)
  })

  it('checks when returning, restoring navigation, or reconnecting', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await flush()
    for (const [target, name] of [[document, 'visibilitychange'], [window, 'pageshow'], [window, 'online']] as const) {
      target.dispatchEvent(new Event(name))
      await flush()
    }
    expect(update).toHaveBeenCalledTimes(4)
  })

  it('skips hidden tabs and checks as soon as they become visible', async () => {
    visible = false
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS * 3)
    window.dispatchEvent(new Event('pageshow'))
    await flush()
    expect(update).not.toHaveBeenCalled()
    visible = true
    document.dispatchEvent(new Event('visibilitychange'))
    await flush()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('preserves offline play and checks on reconnection', async () => {
    online = false
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS * 2)
    expect(update).not.toHaveBeenCalled()
    online = true
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent lifecycle events and periodic checks until the request finishes', async () => {
    let finish!: (r: ServiceWorkerRegistration) => void
    const update = vi.fn(() => new Promise<ServiceWorkerRegistration>(resolve => { finish = resolve }))
    stop = watchForUpdates({ update })
    await flush()
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(1)
    finish({} as ServiceWorkerRegistration)
    await flush()
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(update).toHaveBeenCalledTimes(2)
    finish({} as ServiceWorkerRegistration)
  })

  it('contains rejected and synchronous errors, then permits a later retry', async () => {
    const update = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => { throw new Error('registration unavailable') })
      .mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await flush()
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS * 2)
    expect(update).toHaveBeenCalledTimes(3)
  })

  it('removes its timer and all event listeners on teardown', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    await flush()
    stop()
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(UPDATE_INTERVAL_MS * 2)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('does not begin a queued check after teardown', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    stop = watchForUpdates({ update })
    stop()
    await flush()
    expect(update).not.toHaveBeenCalled()
  })
})

describe('reloadOnce', () => {
  it('does not reload at creation and handles duplicate activation notifications only once', () => {
    const reload = vi.fn()
    const activate = reloadOnce(reload)
    expect(reload).not.toHaveBeenCalled()
    activate()
    activate()
    activate()
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
