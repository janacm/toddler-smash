# AGENTS.md — toddler-smash

Conventions for any AI agent working in this repo. Read this before changing code.

## What this is

A browser game for a 2-and-4-year-old. The design constraint that drives every
decision: **the player cannot read, cannot be instructed, and will press
everything.** There is no failure state, no menu they can get stuck in, and no
error they could ever be shown.

The second goal is that the repo is pleasant to *prompt at*. Changes should
usually be one file, verified by looking at a screenshot.

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
```

`npm run shot` mashes Smash in Daytime (`latest.png`), taps the child's piano
button and plays it (`piano.png`), opens the grown-up panel (`panel.png`), then
switches to Bedtime + Smash and mashes again (`bedtime.png`). **Read the
screenshots.** A visual change cannot be verified from a diff. The script exits
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
  switcher.ts        the child's round sub-game buttons, top-right
  desktop.ts         Tauri bridge: isDesktop, quit, keyboard-lock status
  scenes/PlayScene.ts  the only scene; also the grown-up panel
  modes/             sub-games
    types.ts         Mode
    index.ts         MODES registry (order = panel number keys)
    smash.ts         the original game: the toy registry below
    piano.ts         rainbow piano, scenery + its own toy
  toys/
    types.ts         SmashEvent, Toy, ToyContext
    index.ts         TOYS registry (Smash's toys) + playSmash
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
  re-run on resize and mood change.
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
  non-reader can find. The grown-up panel (hold Escape 3s) is the one exception
  and it's deliberately hard to reach by accident.
- **No image or audio files.** Everything is drawn or synthesized in code, so an
  agent can read and change every asset. Adding a `.png` breaks that property.
- **Errors are swallowed globally** (`src/main.ts`). Keep it that way. A stack
  trace on screen is a failure of the core requirement.
- **In the desktop app, the grown-up panel's Q is the only way out.** Window
  close and app exit are refused unless `quit` was called. Don't add another
  exit a child could hit.

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
| "new effect when you press a key" | new file in `src/toys/` |
| "letters should do X" | `src/toys/letterPop.ts` |
| "stop key X doing a browser thing" | `src/input.ts` |
| "stop key X doing an OS thing" | `src-tauri/src/lockdown/` |

## Testing what actually matters

There are no unit tests, and adding them for tween choreography would be low
value. The meaningful checks are:

1. `npm run build` — types and bundle.
2. `npm run shot` — renders, and no console errors.
3. Look at the screenshot.

If you change mash-tolerance behaviour, raise the key count in
`scripts/screenshot.mjs` and drop the delay to simulate harder mashing.
