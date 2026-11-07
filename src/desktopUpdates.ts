import { isDesktop, restartApp } from './desktop'
import { check as tauriCheck } from '@tauri-apps/plugin-updater'

export const DESKTOP_UPDATE_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export type DesktopUpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'installing' | 'error'

export interface DesktopUpdateState {
  status: DesktopUpdateStatus
  version?: string
  error?: string
}

export interface DesktopUpdateHandle {
  version: string
  download: () => Promise<void>
  install: () => Promise<void>
  close?: () => Promise<void>
}

export interface DesktopUpdaterBackend {
  check: () => Promise<DesktopUpdateHandle | null>
  restart: () => void
}

export function createDefaultDesktopUpdaterBackend(
  isDesktopApp = isDesktop,
  checkFn = tauriCheck,
  restartFn = restartApp,
): DesktopUpdaterBackend {
  return {
    async check() {
      if (!isDesktopApp) return null
      const update = await checkFn()
      if (!update) return null
      return {
        version: update.version,
        download: () => update.download(),
        install: () => update.install(),
        close: () => update.close(),
      }
    },
    restart() {
      restartFn()
    },
  }
}

export const defaultDesktopUpdaterBackend = createDefaultDesktopUpdaterBackend()

let currentState: DesktopUpdateState = { status: 'idle' }
let currentHandle: DesktopUpdateHandle | undefined
let activePromise: Promise<unknown> | undefined
const listeners = new Set<(state: DesktopUpdateState) => void>()

function setState(next: DesktopUpdateState): void {
  currentState = next
  for (const listener of listeners) {
    try {
      listener(currentState)
    } catch {
      // Swallowed: external listener failure must never disrupt updater logic
    }
  }
}

export function getDesktopUpdateState(): DesktopUpdateState {
  return currentState
}

export function onDesktopUpdateChange(listener: (state: DesktopUpdateState) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Checks for an update and, if found, silently downloads it in the background
 * without restarting or disrupting active play.
 */
export async function checkAndDownloadUpdate(
  backend: DesktopUpdaterBackend = defaultDesktopUpdaterBackend,
): Promise<DesktopUpdateState> {
  if (currentState.status === 'ready') return currentState
  if (activePromise) {
    await activePromise
    return currentState
  }

  const run = async () => {
    setState({ status: 'checking' })
    try {
      const handle = await backend.check()
      if (!handle) {
        currentHandle = undefined
        setState({ status: 'idle' })
        return
      }

      currentHandle = handle
      setState({ status: 'downloading', version: handle.version })

      // Silently download the payload in the background
      await handle.download()
      setState({ status: 'ready', version: handle.version })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      currentHandle = undefined
      setState({ status: 'error', error: message })
    }
  }

  activePromise = run().finally(() => {
    activePromise = undefined
  })

  await activePromise
  return currentState
}

/**
 * Called when the parent selects "Update" in the grown-up menu.
 * Installs the verified update and restarts the app with keyboard locks released.
 */
export async function applyDesktopUpdate(
  backend: DesktopUpdaterBackend = defaultDesktopUpdaterBackend,
): Promise<boolean> {
  if (currentState.status === 'ready' && currentHandle) {
    setState({ status: 'installing', version: currentHandle.version })
    try {
      await currentHandle.install()
      backend.restart()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState({ status: 'error', error: message })
      return false
    }
  }

  if (currentState.status === 'downloading' && activePromise) {
    await activePromise
    if (getDesktopUpdateState().status === 'ready' && currentHandle) {
      return applyDesktopUpdate(backend)
    }
  }

  return false
}

/**
 * Watches for updates in the background on startup, online events, and interval.
 * Never pops up any UI or dialog. Returns a stop/teardown function.
 */
export function watchForDesktopUpdates(
  backend: DesktopUpdaterBackend = defaultDesktopUpdaterBackend,
  intervalMs = DESKTOP_UPDATE_INTERVAL_MS,
): () => void {
  let stopped = false

  const trigger = () => {
    if (stopped || !navigator.onLine || activePromise || currentState.status === 'ready') return
    checkAndDownloadUpdate(backend).catch(() => {})
  }

  window.addEventListener('online', trigger)
  const timer = window.setInterval(trigger, intervalMs)

  // Initial check
  trigger()

  return () => {
    stopped = true
    window.clearInterval(timer)
    window.removeEventListener('online', trigger)
    if (currentHandle?.close) {
      currentHandle.close().catch(() => {})
    }
  }
}

/** Reset internal state for tests. */
export function _resetDesktopUpdateState(): void {
  currentState = { status: 'idle' }
  currentHandle = undefined
  activePromise = undefined
  listeners.clear()
}
