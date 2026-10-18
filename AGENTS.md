# AGENTS.md — toddler-smash

Conventions for any AI agent working in this repo. Read this before changing code.

## What this is

A browser game for a 2-and-4-year-old. The design constraint that drives every
decision: **the player cannot read, cannot be instructed, and will press
everything.** There is no failure state, no menu they can get stuck in, and no
error they could ever be shown.

The second goal is that the repo is pleasant to *prompt at*. Changes should
usually be one file, verified by looking at a screenshot.

The full list of requirements, each with where it lives and how it's checked,
is in [docs/requirements.md](docs/requirements.md). When a request adds or
changes a requirement, update that file in the same change.

## Stack

- **Phaser 3** — scene, input, tween, and texture handling.
- **TypeScript**, strict. `npm run typecheck` must pass.
- **Vite** — dev server and build.
- **Playwright** — headless screenshot verification.
- **Tauri 2** (`src-tauri/`, Rust) — optional desktop wrapper with a native
  keyboard lock. The game itself doesn't depend on it.

## The loop

```bash
npm run dev        # http://127.0.0.1:5173 — hot reload while iterating
npm run typecheck  # fast correctness gate
npm run build      # typecheck + production build
npm run shot       # build output → headless Chromium → shots/*.png
npm test           # Vitest unit tests
npm run test:coverage # same, failing below the coverage thresholds (CI runs this)
npm run test:rust  # desktop keyboard-lock rules (cargo test)
```

`npm run shot` first stalls the game bundle to photograph the loading splash
(`splash.png`, `splash-bedtime.png`, `mobile-splash.png`) and checks it goes
away once the game loads. Then it mashes Smash in Daytime (`latest.png`), taps the child's piano
button and plays it (`piano.png`), scribbles in Drawing (`drawing.png`, and
`drawing-faded.png` 6s later), opens the grown-up panel (`panel.png`), then
switches to Bedtime + Smash and mashes again (`bedtime.png`). Then a 390×844
touch phone taps around (`mobile.png`), switches to piano (`mobile-piano.png`),
draws with two fingers (`mobile-drawing.png`) and opens the panel with a real
two-finger corner hold (`mobile-panel.png`). **Read the screenshots.** A
visual change cannot be verified from a diff. The script exits
non-zero if the page logged any console error, so a green run means both "it
looks like this" and "nothing threw."

## Architecture

```
src/
  config.ts          all tunable numbers, including moods — try here first
  settings.ts        current mode / mood / corner buttons, saved to localStorage
  audio.ts           WebAudio synth, voice-capped, pentatonic; blip + piano voices
  textures.ts        every shape drawn at runtime; no image files
  pool.ts            SpritePool + TextPool — the hard caps
  input.ts           keyboard/pointer → SmashEvent, plus browser-shortcut defense
  gestures.ts        two-finger corner hold (the touch way into the panel)
  switcher.ts        the child's round sub-game buttons, top-right
  parentPanel.ts     the grown-up panel: tappable buttons, scales to fit
  safeArea.ts        notch / home-indicator insets from CSS env()
  splash.ts          loading splash: mood colours + saved-mood script that
                     vite.config.ts injects into index.html; hideSplash
  desktop.ts         Tauri bridge: isDesktop, quit, keyboard-lock status
  scenes/PlayScene.ts  the only scene
  modes/             sub-games
    types.ts         Mode
    index.ts         MODES registry (order = panel number keys)
    smash.ts         the original game: the toy registry below
    piano.ts         rainbow piano, scenery + its own toy
    drawing.ts       finger painting on a slowly fading RenderTexture
    drawingMath.ts   pure stroke / brush / pitch helpers (unit-tested)
  toys/
    types.ts         SmashEvent, Toy, ToyContext
    index.ts         TOYS registry (Smash's toys) + playSmash
    play.ts          picks a toy for a smash, swallows its errors (unit-tested)
    letterPop.ts     ] one file per toy
    shapeBurst.ts    ]
    ripple.ts        ]
    critter.ts       ]
src-tauri/           desktop app (see "Desktop app" below)
```

### Sub-games and moods

A **sub-game** (`Mode`) decides what a smash does; a **mood** restyles
whichever sub-game is running. They're independent, so Bedtime Piano works
without either knowing about the other.

- Adding a sub-game: create `src/modes/myMode.ts` exporting a `Mode` with its
  own `toys` list, and add it to `MODES`. If it needs something permanently on
  screen (piano keys), build it in `enter` and return a cleanup. `enter` is
  re-run on resize and mood change. A mode that follows a moving finger
  (drawing) also implements `stroke`, which gets un-rate-limited move/end
  events per `pointerId`.

  Registering it gives it its own corner button and panel number key
  automatically. Every sub-game is top-level; never nest one inside another,
  because the child needs to reach each with one tap. Then:
  1. Draw its button icon in `textures.ts` and set `icon`.
  2. Add a pass to `scripts/screenshot.mjs` (bump `MODE_COUNT`) and read it.
  3. Update `docs/grown-ups.md` (key table, Games, corner buttons), the
     README's sub-game list, and `docs/requirements.md`.
  4. Remember installed devices see it only after a reload or relaunch.
- Adding a mood: copy a block in `CONFIG.moods` and give it a new `panelKey`.
  A mood sets palette, background, tween `timeScale`, spawn rate, and synth
  volume, waveform, note length and octave.

The grown-up panel picks both (number keys for sub-games, mood `panelKey`s).
The child can switch sub-game with the corner buttons, but not mood, so
Bedtime stays Bedtime. Sub-game switching is pointer-only on purpose: a
keyboard shortcut would be mashed constantly. `C` in the panel hides the
buttons.

### Adding a new effect — the main extension point

1. Create `src/toys/myToy.ts` exporting a `Toy`.
2. Add it to the `TOYS` array in `src/toys/index.ts`.

That is the whole contract. Don't touch `PlayScene` to add an effect.

```ts
import type { Toy } from './types'

export const myToy: Toy = {
  name: 'myToy',
  weight: 2,              // relative chance in the random rotation
  // match: (e) => e.char === 'Q',   // or claim specific input exclusively
  play(e, ctx) {
    const img = ctx.pool.spawn('star', e.x, e.y)
    img.setTint(ctx.color(e.index))
    ctx.scene.tweens.add({ targets: img, scale: 2, duration: 500 })
    ctx.pool.retire(img, 1200)
    ctx.synth.play(e.index)
  },
}
```

A toy that throws is caught and skipped — the game keeps running. Don't rely on
that; it's a safety net, not a pattern.

## Rules that exist for a reason

Breaking these breaks the actual requirement, so don't "clean them up":

- **Always spawn through `ctx.pool` / `ctx.text`.** Never `scene.add.image` in a
  toy. The pools' hard caps are what keep sustained mashing from leaking memory
  and tanking framerate. Recycling the oldest sprite is intentional.
- **Never `destroy()` a pooled object.** Retire it. Destroyed objects have to be
  reallocated on the next keypress, which is the churn we're avoiding.
- **Keep audio on the pentatonic scale** (`CONFIG.audio.scaleSemitones`). It is
  the reason random mashing sounds musical instead of painful. Adding a note
  outside the scale will make thirty simultaneous presses dissonant.
- **Respect `maxVoices`.** Uncapped oscillators clip into distortion under
  mashing.
- **Ignore `ev.repeat` in keydown.** A held key fires ~30x/sec; a forearm on the
  keyboard should produce one burst per key, then quiet.
- **No new scenes, menus, or modal states** without a way out that a
  non-reader can find. The grown-up panel (hold Escape 3s, or hold the
  top-left and bottom-right corners 3s on touch) is the one exception and
  it's deliberately hard to reach by accident.
- **No image or audio files.** Everything is drawn or synthesized in code, so an
  agent can read and change every asset. Adding a `.png` breaks that property.
- **Errors are swallowed globally** (`src/main.ts`). Keep it that way. A stack
  trace on screen is a failure of the core requirement.
- **In the desktop app, the grown-up panel's Q is the only way out.** Window
  close and app exit are refused unless `quit` was called. Don't add another
  exit a child could hit.

## Web deploy

Live at https://toddler-smash.netlify.app (Netlify site `toddler-smash`,
config in `netlify.toml`). Deploys are manual from a local build:

```bash
npm run build && netlify deploy --prod --dir dist --no-build
```

The site's "Powered by Netlify" badge is turned off
(`built_with_badge_enabled: false`). Keep it off: it's a link floating over
the game, and a toddler will tap it.

The web build is an installable PWA (`vite-plugin-pwa` in `vite.config.ts`):
fullscreen manifest, `public/icon.svg`, and a service worker that precaches
everything so it plays offline. The service worker is registered in
`src/main.ts` only outside the desktop app.

Because of that cache, a deploy doesn't reach a device that already has the
game until it reloads, or for a home-screen install, until it's fully closed
and reopened (sometimes twice). After deploying, check the live site in a
fresh browser rather than one that has played before. If someone says a new
feature is missing, suspect the cache first; the grown-up menu's key hint
("Keys: 1–N game") shows which version they're on.

## Desktop app

`src-tauri/` wraps the same `dist/` build in a borderless, full-screen window
and adds what a browser can't do:

- **Windows** (`lockdown/win.rs`): a low-level keyboard hook swallows the
  Windows keys, the menu key, Alt-Tab/Esc/F4/Space, Ctrl-Esc, Ctrl-Shift-Esc
  and media keys while the game is in front. It also turns off the Sticky /
  Filter / Toggle Keys hotkeys and restores them on quit. Ctrl-Alt-Del and
  Win-L can't be blocked.
- **macOS** (`lockdown/mac.rs`): a CGEventTap strips Cmd/Ctrl/Option/Fn from
  every key and swallows media and system keys. Kiosk presentation options hide
  the Dock and menu bar and disable app switching and Force Quit. Needs the
  Accessibility permission. Until it's granted the app prompts and stays
  escapable, so the grown-up can reach System Settings.

```bash
npm run desktop:dev    # Vite + native window, hot reload
npm run desktop:build  # installers in src-tauri/target/release/bundle/
```

To type-check the Windows code from a Mac:
`rustup target add x86_64-pc-windows-msvc && cd src-tauri && cargo check --target x86_64-pc-windows-msvc`
(the build script needs an `llvm-rc` on PATH).

## Common requests → where they land

| Request | File |
| --- | --- |
| "slower / floatier / calmer" | `config.ts` → `moods.*.timeScale`, `lifetime` |
| "more things on screen" | `config.ts` → `limits.maxSprites` |
| "quieter / different sound" | `config.ts` → `moods.*.audio` |
| "different colours" | `config.ts` → `moods.*.palette` |
| "bedtime should be darker / slower" | `config.ts` → `moods.bedtime` |
| "a new sub-game" | new file in `src/modes/` |
| "the piano should do X" | `src/modes/piano.ts` |
| "thicker brush / drawing fades slower" | `config.ts` → `drawing` |
| "new effect when you press a key" | new file in `src/toys/` |
| "letters should do X" | `src/toys/letterPop.ts` |
| "stop key X doing a browser thing" | `src/input.ts` |
| "the grown-up menu should have X" | `src/parentPanel.ts` + `PlayScene.runPanelAction` |
| "looks wrong on a phone" | `safeArea.ts`, `config.ts` → `piano`, then `mobile*.png` |
| "stop key X doing an OS thing" | `src-tauri/src/lockdown/` |
| "the loading screen / logo should do X" | `index.html` (`#splash` markup and CSS), `config.ts` → `splash`, then `splash*.png` |

## Testing what actually matters

Unit tests cover pure logic only. Testing tween choreography would be low
value; that's what the screenshots are for. The checks, in order:

1. `npm run build` — types and bundle.
2. `npm test` — Vitest: piano key mapping and key count, drawing stroke /
   brush / pitch maths, the corner-hold gesture, settings parsing and saving,
   toy routing, the loading splash (mood colours match `index.html`, saved
   mood picked, fades on time or on a press), keyboard and pointer input (repeats ignored, browser shortcuts
   swallowed, rate limit, both grown-up holds), mood config invariants (panel
   keys unique, bedtime calmer than daytime, volume below clipping, pentatonic
   scale). `npm run test:coverage` is the same run with a coverage gate: each
   logic module listed in `vitest.config.ts` must stay at 90% of lines and 85%
   of branches and functions, or CI fails.
3. `npm run test:rust` — the desktop keyboard-lock rules for both macOS and
   Windows, runnable on any OS.
4. `npm run shot` — renders, and no console errors.
5. Look at the screenshots.

Tests live next to the code (`*.test.ts`) and must not import Phaser, which
needs a browser. If logic worth testing lives in a Phaser file, move it into a
plain module first, as with `modes/pianoLayout.ts`, `modes/drawingMath.ts`
and `toys/play.ts`, and add it to the coverage `include` list in
`vitest.config.ts`. Tests that need `window`, `localStorage` or DOM events
start with `// @vitest-environment happy-dom` (see `input.test.ts`). Native
lock logic belongs in `src-tauri/src/lockdown/rules.rs` for the same reason.

CI (`.github/workflows/ci.yml`) runs all of this. Rust tests run on real
macOS and Windows runners, which is the only place the Windows code gets
compiled for real. Screenshots and the HTML coverage report are uploaded as
artifacts.

If you change mash-tolerance behaviour, raise the key count in
`scripts/screenshot.mjs` and drop the delay to simulate harder mashing.

## More docs

- [docs/requirements.md](docs/requirements.md) — what the game must do, where
  each requirement lives, and how it's checked.
- [docs/grown-ups.md](docs/grown-ups.md) — the parent guide: menu, games,
  moods, prep before playtime, getting the latest version.
- [docs/desktop.md](docs/desktop.md) — desktop install, what's blocked and
  what can't be, troubleshooting, building, how the lock works.
