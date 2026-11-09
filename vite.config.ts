import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { splashCss, splashScript } from './src/splash'
import { randomUUID } from 'node:crypto'
import { execSync } from 'node:child_process'

function resolveGitCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

// Git alone cannot identify local manual deploys containing uncommitted edits.
const buildId = `${new Date().toISOString()}-${randomUUID().slice(0, 8)}`
const commitSha = resolveGitCommit()
const versionCode = commitSha ? commitSha.slice(-4) : 'dev'

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __VERSION_CODE__: JSON.stringify(versionCode),
  },
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { target: 'es2022' },
  plugins: [
    {
      name: 'build-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId, versionCode }) })
      },
    },
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
        // injectRegister:false prevents this plugin version's autoUpdate defaults.
        skipWaiting: true,
        clientsClaim: true,
        // This diagnostic is a network document, never the cached app shell.
        navigateFallbackDenylist: [/^\/version\.json(?:\?|$)/],
        globPatterns: ['**/*.{js,css,html,svg}'],
        // The Phaser bundle is ~1.4 MB; the default 2 MB cap leaves little room.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
