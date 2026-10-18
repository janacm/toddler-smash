# Requirements

What the game must do, why, where it's implemented, and how it's checked.
When a change would break one of these, the requirement wins. When a new
request adds or changes one, update this file in the same change.

## Players

Two children, aged 2 and 4. They can't read, can't be given instructions,
and will press, tap and lean on everything. A grown-up sets the game up and
is the only person who changes settings.

## Core

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| C1 | Any key, tap or click does something visible and audible. | `input.ts`, `toys/`, `modes/` | screenshots |
| C2 | No failure state, no levels, no game over, no dialog, no text the child must read. | `PlayScene.ts` (the only scene) | review |
| C3 | Nothing the child can do shows an error or stops the game. Errors are swallowed. | `main.ts`, `toys/play.ts` | `play.test.ts` (a throwing toy is skipped), `npm run shot` fails on any console error |
| C4 | Sustained mashing doesn't slow down, leak memory or distort audio. Sprites, text and voices are hard-capped; held keys fire once. | `pool.ts`, `audio.ts` (`maxVoices`), `input.ts` (`ev.repeat`) | `input.test.ts` (repeats ignored, rate limit), screenshots under mashing |
| C5 | Random input sounds musical: every note is on the pentatonic scale. | `audio.ts`, `CONFIG.audio` | `config.test.ts` |
| C6 | No image or audio files. Everything is drawn or synthesized in code, so it can all be read and changed. Bundler icons are the only exception. | `textures.ts`, `audio.ts` | review |
| C7 | While the game loads, a cute animated "Toddler Smash" logo and spinner show, in the saved mood's colours so Bedtime never flashes bright. It never blocks a press: a press makes the logo bounce, and once the game is ready a press skips straight to it. It fades by itself after at least a second. | `index.html` (`#splash`), `splash.ts`, `vite.config.ts` | `splash.test.ts`, `splash.png`, `splash-bedtime.png`, `mobile-splash.png` (and `npm run shot` checks it goes away) |

## Sub-games

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| G1 | Several sub-games, one running at a time: **Smash**, **Piano**, **Drawing**. | `modes/` | screenshots |
| G2 | Piano: rainbow keys; the same input always plays the same key; 10 keys on wide screens, 5 to 8 on phones so keys stay finger-sized. | `modes/piano.ts`, `pianoLayout.ts` | `pianoLayout.test.ts`, `piano.png`, `mobile-piano.png` |
| G3 | Drawing: drag to paint with several fingers at once; keys stamp stickers; old drawing fades, so the screen never fills and nothing needs clearing. | `modes/drawing.ts`, `drawingMath.ts` | `drawingMath.test.ts`, `drawing*.png`, `mobile-drawing.png` |
| G4 | **Every sub-game has its own round button** in the top-right corner that the child can tap. Sub-games are never nested inside each other. | `switcher.ts` (one button per entry in `MODES`) | screenshots |
| G5 | The child switches sub-games only by tapping those buttons, never by a key, so mashing can't flip games. The grown-up can hide the buttons. | `PlayScene.handleSmash`, panel `C` | review |

## Moods

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| M1 | **Daytime** (default): bright, clear and calm, never overstimulating or flashing. | `CONFIG.moods.daytime` | `latest.png` |
| M2 | **Bedtime**: dark sky, pastels, slower motion, fewer things on screen, quieter and lower notes. | `CONFIG.moods.bedtime` | `config.test.ts` (calmer than daytime), `bedtime.png` |
| M3 | A mood applies to every sub-game. Only the grown-up can change it, so Bedtime stays Bedtime. | `PlayScene.applyMood` | review |

## Grown-up controls

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| P1 | One grown-up menu, hard to reach by accident: hold Escape for 3 seconds, or on touch hold the top-left and bottom-right corners for 3 seconds. | `input.ts`, `gestures.ts` | `gestures.test.ts`, `input.test.ts`, `panel.png`, `mobile-panel.png` |
| P2 | The menu picks the sub-game, mood, whether the child's buttons show, and full screen (plus Quit in the desktop app). Every option is a tappable button; on a keyboard, number keys pick the game and letters do the rest. | `parentPanel.ts`, `PlayScene.runPanelAction` | screenshots |
| P3 | Choices are remembered between sessions. | `settings.ts` | `settings.test.ts` |

## Platforms

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| W1 | Plays in a desktop browser. Browser shortcuts that don't need a modifier (F5, Tab, Space, quick-find, right-click) are swallowed. | `input.ts` | `input.test.ts` |
| W2 | Plays on phones and tablets: touch, notch-safe layout, readable sizes, no pinch-zoom or scroll. | `safeArea.ts`, `index.html` | `mobile*.png` |
| W3 | Can be added to the home screen and plays full screen and offline. | `vite.config.ts` (PWA) | review |
| W4 | After a deploy, devices that saved the game get the new version. Today that happens after a reload, or after the home-screen app has been fully closed and reopened (sometimes twice). | `main.ts` (`registerSW`) | manual |
| W5 | Publicly hosted at https://toddler-smash.netlify.app with no floating badge or link over the game. | `netlify.toml`, Netlify site settings | manual |
| D1 | A Windows and Mac desktop app that a toddler can't leave: blocks the Windows and menu keys, Alt-Tab, Cmd-Q, Cmd-Tab, Spotlight, media keys and similar. Asking for the Mac Accessibility permission is acceptable. | `src-tauri/` | `npm run test:rust`, CI on macOS and Windows |
| D2 | In the desktop app, the grown-up menu's Quit is the only way out. | `src-tauri/src/lib.rs` | review |

## Out of scope

- Blocking what no app can block: Ctrl-Alt-Del, Win-L, the power button,
  and touchpad gestures handled by the OS. The guide explains how to turn
  those off.
- Locking a phone or tablet to the app. Use Guided Access (iOS) or App
  pinning (Android).
- Accounts, scores, progress, ads, or anything online beyond loading the game.
