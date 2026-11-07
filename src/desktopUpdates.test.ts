// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _resetDesktopUpdateState,
  applyDesktopUpdate,
  checkAndDownloadUpdate,
  createDefaultDesktopUpdaterBackend,
  defaultDesktopUpdaterBackend,
  DESKTOP_UPDATE_INTERVAL_MS,
  getDesktopUpdateState,
  onDesktopUpdateChange,
  watchForDesktopUpdates,
  type DesktopUpdateHandle,
  type DesktopUpdaterBackend,
} from './desktopUpdates'

let online = true
const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
  online = true
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  _resetDesktopUpdateState()
})

afterEach(() => {
  _resetDesktopUpdateState()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('desktopUpdates', () => {
  it('transitions through checking -> idle when no update is available', async () => {
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(null),
      restart: vi.fn(),
    }

    const promise = checkAndDownloadUpdate(backend)
    expect(getDesktopUpdateState().status).toBe('checking')
    const finalState = await promise
    expect(finalState.status).toBe('idle')
    expect(backend.check).toHaveBeenCalledTimes(1)
  })

  it('downloads update in background and sets state to ready without restarting', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    const stateHistory: string[] = []
    const unsub = onDesktopUpdateChange((s) => stateHistory.push(s.status))

    const finalState = await checkAndDownloadUpdate(backend)
    expect(finalState.status).toBe('ready')
    expect(finalState.version).toBe('0.2.0')
    expect(handle.download).toHaveBeenCalledTimes(1)
    expect(handle.install).not.toHaveBeenCalled()
    expect(backend.restart).not.toHaveBeenCalled()
    expect(stateHistory).toEqual(['checking', 'downloading', 'ready'])

    unsub()
  })

  it('returns current state immediately if an update is already ready', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    await checkAndDownloadUpdate(backend)
    expect(getDesktopUpdateState().status).toBe('ready')

    const secondCheck = await checkAndDownloadUpdate(backend)
    expect(secondCheck.status).toBe('ready')
    expect(backend.check).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent checks so only one download runs at once', async () => {
    let finishDownload!: () => void
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn(() => new Promise<void>((resolve) => { finishDownload = resolve })),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    const p1 = checkAndDownloadUpdate(backend)
    const p2 = checkAndDownloadUpdate(backend)

    // Flush microtasks so backend.check() resolves and download starts
    await Promise.resolve()
    expect(backend.check).toHaveBeenCalledTimes(1)
    expect(getDesktopUpdateState().status).toBe('downloading')
    finishDownload()

    const [res1, res2] = await Promise.all([p1, p2])
    expect(res1.status).toBe('ready')
    expect(res2.status).toBe('ready')
    expect(handle.download).toHaveBeenCalledTimes(1)
  })

  it('catches and reports check errors without throwing', async () => {
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockRejectedValue(new Error('Network timeout')),
      restart: vi.fn(),
    }

    const state = await checkAndDownloadUpdate(backend)
    expect(state.status).toBe('error')
    expect(state.error).toBe('Network timeout')
  })

  it('catches and reports download errors without throwing', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockRejectedValue('Download corrupt'),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    const state = await checkAndDownloadUpdate(backend)
    expect(state.status).toBe('error')
    expect(state.error).toBe('Download corrupt')
  })

  it('applies ready update by installing and restarting', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    await checkAndDownloadUpdate(backend)
    expect(getDesktopUpdateState().status).toBe('ready')

    const applied = await applyDesktopUpdate(backend)
    expect(applied).toBe(true)
    expect(handle.install).toHaveBeenCalledTimes(1)
    expect(backend.restart).toHaveBeenCalledTimes(1)
  })

  it('handles applyDesktopUpdate while download is in progress', async () => {
    let finishDownload!: () => void
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn(() => new Promise<void>((resolve) => { finishDownload = resolve })),
      install: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    const checkPromise = checkAndDownloadUpdate(backend)
    await Promise.resolve()
    expect(getDesktopUpdateState().status).toBe('downloading')

    const applyPromise = applyDesktopUpdate(backend)
    finishDownload()

    await checkPromise
    const applied = await applyPromise
    expect(applied).toBe(true)
    expect(handle.install).toHaveBeenCalledTimes(1)
    expect(backend.restart).toHaveBeenCalledTimes(1)
  })

  it('applyDesktopUpdate returns false if no update is ready or downloading', async () => {
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(null),
      restart: vi.fn(),
    }

    const applied = await applyDesktopUpdate(backend)
    expect(applied).toBe(false)
    expect(backend.restart).not.toHaveBeenCalled()
  })

  it('applyDesktopUpdate reports error if installation fails', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockRejectedValue(new Error('Permission denied')),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    await checkAndDownloadUpdate(backend)
    const applied = await applyDesktopUpdate(backend)
    expect(applied).toBe(false)
    expect(getDesktopUpdateState().status).toBe('error')
    expect(getDesktopUpdateState().error).toBe('Permission denied')
    expect(backend.restart).not.toHaveBeenCalled()
  })

  it('watchForDesktopUpdates checks periodically and on reconnect', async () => {
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(null),
      restart: vi.fn(),
    }

    const stop = watchForDesktopUpdates(backend, DESKTOP_UPDATE_INTERVAL_MS)
    await flush()
    expect(backend.check).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(DESKTOP_UPDATE_INTERVAL_MS)
    expect(backend.check).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('online'))
    await flush()
    expect(backend.check).toHaveBeenCalledTimes(3)

    stop()

    await vi.advanceTimersByTimeAsync(DESKTOP_UPDATE_INTERVAL_MS)
    window.dispatchEvent(new Event('online'))
    await flush()
    expect(backend.check).toHaveBeenCalledTimes(3)
  })

  it('watchForDesktopUpdates closes update handle on teardown if close is available', async () => {
    const handle: DesktopUpdateHandle = {
      version: '0.2.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(handle),
      restart: vi.fn(),
    }

    const stop = watchForDesktopUpdates(backend, DESKTOP_UPDATE_INTERVAL_MS)
    await flush()
    expect(handle.download).toHaveBeenCalledTimes(1)

    stop()
    expect(handle.close).toHaveBeenCalledTimes(1)
  })

  it('swallows errors from throwing listeners on state change', async () => {
    const unsub = onDesktopUpdateChange(() => {
      throw new Error('Bad listener')
    })
    const backend: DesktopUpdaterBackend = {
      check: vi.fn().mockResolvedValue(null),
      restart: vi.fn(),
    }

    await expect(checkAndDownloadUpdate(backend)).resolves.toBeDefined()
    unsub()
  })

  it('default backend is safely inert in non-desktop environments', async () => {
    const res = await defaultDesktopUpdaterBackend.check()
    expect(res).toBeNull()
    expect(() => defaultDesktopUpdaterBackend.restart()).not.toThrow()
  })

  it('createDefaultDesktopUpdaterBackend forwards calls to updater and desktop helpers', async () => {
    const mockUpdate = {
      version: '0.3.0',
      download: vi.fn().mockResolvedValue(undefined),
      install: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    const checkFn = vi.fn().mockResolvedValue(mockUpdate)
    const restartFn = vi.fn()

    const backend = createDefaultDesktopUpdaterBackend(true, checkFn as never, restartFn)
    const handle = await backend.check()
    expect(handle).not.toBeNull()
    expect(handle?.version).toBe('0.3.0')

    await handle?.download()
    expect(mockUpdate.download).toHaveBeenCalledTimes(1)

    await handle?.install()
    expect(mockUpdate.install).toHaveBeenCalledTimes(1)

    await handle?.close?.()
    expect(mockUpdate.close).toHaveBeenCalledTimes(1)

    backend.restart()
    expect(restartFn).toHaveBeenCalledTimes(1)
  })

  it('createDefaultDesktopUpdaterBackend returns null when checkFn finds no update', async () => {
    const checkFn = vi.fn().mockResolvedValue(null)
    const backend = createDefaultDesktopUpdaterBackend(true, checkFn as never)
    const handle = await backend.check()
    expect(handle).toBeNull()
  })
})
