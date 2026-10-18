import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { splashCss, splashScript } from './src/splash'

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { target: 'es2022' },
  plugins: [
    // The loading splash in index.html takes its colours from CONFIG.moods and
    // picks the saved mood before first paint. See src/splash.ts.
    {
      name: 'splash',
      transformIndexHtml: () => [
        { tag: 'style', children: splashCss(), injectTo: 'head' },
        { tag: 'script', children: splashScript(), injectTo: 'head' },
      ],
    },
    // Installable from a phone's home screen: opens full screen without the
    // browser bar, and works offline once loaded. The service worker is
    // registered from main.ts, and only in the browser (not the desktop app).
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: {
        name: 'Toddler Smash',
        short_name: 'Smash',
        description: 'Press anything. Letters, shapes, a piano, and a bedtime mode.',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#dcefff',
        theme_color: '#1b2035',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // The Phaser bundle is ~1.4 MB; the default 2 MB cap leaves little room.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
