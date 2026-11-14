import Phaser from 'phaser'
import { currentMood } from './settings'
import { isDesktop } from './desktop'
import { PlayScene } from './scenes/PlayScene'
import { hideSplash } from './splash'
import { startWebUpdates } from './webUpdates'
import { watchForDesktopUpdates } from './desktopUpdates'
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
} else if (isDesktop) {
  watchForDesktopUpdates()
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: currentMood().background.top,
  scale: {
    mode: Phaser.Scale.RESIZE,
    // Include the persistent HTML logo when the grown-up selects full screen.
    fullscreenTarget: document.documentElement,
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

/**
 * Phaser's scale manager sizes the canvas in CSS pixels. On a Retina screen
 * that makes the browser enlarge a 1x WebGL surface, softening every label.
 * Render into a device-pixel-sized surface and scale the camera viewport by
 * the same ratio; scene coordinates and pointer layout remain CSS pixels.
 */
function resizeForDevicePixels(): void {
  if (game.renderer.type !== Phaser.WEBGL) return

  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const width = game.scale.width
  const height = game.scale.height
  const pixelWidth = Math.round(width * ratio)
  const pixelHeight = Math.round(height * ratio)
  const scrollX = -width * (ratio - 1) / 2
  const scrollY = -height * (ratio - 1) / 2

  if (game.canvas.width !== pixelWidth || game.canvas.height !== pixelHeight) {
    game.canvas.width = pixelWidth
    game.canvas.height = pixelHeight
    game.renderer.resize(pixelWidth, pixelHeight)
  }
  game.canvas.style.width = `${width}px`
  game.canvas.style.height = `${height}px`

  for (const scene of game.scene.getScenes(true)) {
    for (const camera of scene.cameras.cameras) {
      if (
        camera.width !== pixelWidth || camera.height !== pixelHeight || camera.zoom !== ratio ||
        camera.scrollX !== scrollX || camera.scrollY !== scrollY
      ) {
        camera.setSize(pixelWidth, pixelHeight).setZoom(ratio).setScroll(scrollX, scrollY)
      }
    }
  }
}

// Wait until the Scale Manager and the scene camera have completed their
// initial sizing. Register afterward so this resize runs after Phaser's own.
game.events.once(Phaser.Core.Events.POST_RENDER, () => {
  resizeForDevicePixels()
  game.scale.on(Phaser.Scale.Events.RESIZE, resizeForDevicePixels)
})
