import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    poolOptions: {
      forks: {
        execArgv: ['--localstorage-file=/tmp/vitest-ls'],
      },
      threads: {
        execArgv: ['--localstorage-file=/tmp/vitest-ls'],
      },
    },
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // The logic modules: plain TypeScript that runs without a browser. Code
      // that draws with Phaser or plays WebAudio is checked by `npm run shot`
      // instead. A new Phaser-free module with logic in it belongs here.
      include: [
        'src/combo.ts',
        'src/config.ts',
        'src/gestures.ts',
        'src/input.ts',
        'src/settings.ts',
        'src/splash.ts',
        'src/modes/drawingMath.ts',
        'src/modes/pianoLayout.ts',
        'src/toys/play.ts',
        'src/toys/schemaMath.ts',
        'src/challenges/model.ts',
        'src/challenges/layout.ts',
        'src/challenges/rewards.ts',
        'src/updates.ts',
        'src/desktopUpdates.ts',
        'src/discovery/scratchModel.ts',
        'src/discovery/albumModel.ts',
        'src/explainers.ts',
        'src/explainerBannerLayout.ts',
        'src/hints.ts',
        'src/modes/pianoChoralLogic.ts',
        'src/modes/choralEchoQueue.ts',
        'src/companion/thoughtBubbleLogic.ts',
      ],
      // Per file, so one untested module can't hide behind well-tested ones.
      thresholds: {
        perFile: true,
        lines: 90,
        statements: 90,
        functions: 85,
        branches: 85,
      },
    },
  },
})
