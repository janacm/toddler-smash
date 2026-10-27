export const UPDATE_INTERVAL_MS = 60_000

type UpdateRegistration = Pick<ServiceWorkerRegistration, 'update'>

/** Recheck the worker without letting concurrent lifecycle events flood the network. */
export function watchForUpdates(registration: UpdateRegistration): () => void {
  let stopped = false
  let pending: Promise<unknown> | undefined
  const check = () => {
    if (stopped || document.visibilityState === 'hidden' || !navigator.onLine || pending) return
    pending = Promise.resolve()
      .then(() => { if (!stopped) return registration.update() })
      .catch(() => { /* Keep the complete cached game when the network refuses an update. */ })
      .finally(() => { pending = undefined })
  }
  document.addEventListener('visibilitychange', check)
  window.addEventListener('pageshow', check)
  window.addEventListener('online', check)
  const timer = window.setInterval(check, UPDATE_INTERVAL_MS)
  check()
  return () => {
    stopped = true
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('pageshow', check)
    window.removeEventListener('online', check)
  }
}

/** Workbox can report both local and external activation for the same release. */
export function reloadOnce(reload: () => void): () => void {
  let started = false
  return () => {
    if (started) return
    started = true
    reload()
  }
}
