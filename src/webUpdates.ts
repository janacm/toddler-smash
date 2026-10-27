import { registerSW } from 'virtual:pwa-register'
import { reloadOnce, watchForUpdates } from './updates'

/** The helper and recovery fallback share one guarded, post-activation reload. */
export function startWebUpdates(): void {
  const reload = reloadOnce(() => window.location.reload())
  let controller = navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const next = navigator.serviceWorker.controller
    const updated = controller !== null && next !== null && next !== controller
    controller = next
    if (!updated) return // Initial installation already runs the network build.
    // workbox-window can stop watching updatefound after an external/failed
    // install. Native controller changes still report the eventual recovery.
    if (next.state === 'activated') reload()
    else next.addEventListener('statechange', () => { if (next.state === 'activated') reload() }, { once: true })
  })
  let registration: ServiceWorkerRegistration | undefined
  // The same checker also retries initial registration failures. An offline
  // launch must not lose its reconnect listener before registration succeeds.
  watchForUpdates({
    async update() {
      if (registration) return registration.update()
      return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
        registerSW({
          immediate: true,
          onNeedReload: reload,
          onRegisteredSW(_url, result) {
            if (!result) { reject(new Error('Service worker registration unavailable')); return }
            registration = result
            resolve(result)
          },
          onRegisterError: reject,
        })
      })
    },
  })
}
