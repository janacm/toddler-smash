import Phaser from 'phaser'
import { currentMood } from './settings'
import { isDesktop } from './desktop'
import { PlayScene } from './scenes/PlayScene'
import { hideSplash } from './splash'
import { startWebUpdates } from './webUpdates'
import { BUILD_ID } from './version'

document.documentElement.dataset.buildId = BUILD_ID

/**
 * Nothing that happens in this game is important enough to justify showing a
 * child an error. Swallow everything, log it for the grown-ups, keep drawing.
 */
window.addEventListener('error', (ev) => {
  console.warn('recovered from error:', ev.error ?? ev.message)
  ev.preventDefault()
})
window.addEventListener('unhandledrejection', (ev) => {
  console.warn('recovered from rejection:', ev.reason)
  ev.preventDefault()
})

// Offline support and home-screen install. Not in the desktop app, whose
// tauri:// pages can't host a service worker and don't need one.
if (!isDesktop && 'serviceWorker' in navigator) {
  startWebUpdates()
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: currentMood().background.top,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  // No arcade physics: every toy animates with tweens, which keeps toys
  // independent of each other and of a shared physics world.
  scene: [PlayScene],
  // Losing focus should not pause. A toddler clicking outside the window and
  // back should find the game exactly as they left it.
  autoFocus: true,
  disableContextMenu: true,
})

game.events.once(Phaser.Core.Events.POST_RENDER, hideSplash)
