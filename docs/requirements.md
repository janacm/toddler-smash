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
| C2 | Free play is always available. Optional hidden puzzle tiers have no failure state, game over, dialog, timer, or text the child must read. | `PlayScene.ts` (the only scene), `challenges/` | review, progression screenshots |
| C3 | Nothing the child can do shows an error or stops the game. Errors are swallowed. | `main.ts`, `toys/play.ts` | `play.test.ts` (a throwing toy is skipped), `npm run shot` fails on any console error |
| C4 | Sustained mashing doesn't slow down, leak memory or distort audio. Sprites, text and voices are hard-capped; held keys fire once. | `pool.ts`, `audio.ts` (`maxVoices`), `input.ts` (`ev.repeat`) | `input.test.ts` (repeats ignored, rate limit), screenshots under mashing |
| C5 | Random input sounds musical: every note is on the pentatonic scale. | `audio.ts`, `CONFIG.audio` | `config.test.ts` |
| C6 | No image or audio files. Everything is drawn or synthesized in code, so it can all be read and changed. Bundler icons are the only exception. | `textures.ts`, `audio.ts` | review |
| C7 | While the game loads, a cute animated "Toddler Smash" logo and spinner show, in the saved mood's colours so Bedtime never flashes bright. It never blocks a press: a press makes the logo bounce, and once the game is ready a press skips straight to it. It fades by itself after at least a second. | `index.html` (`#splash`), `splash.ts`, `vite.config.ts` | `splash.test.ts`, `splash.png`, `splash-bedtime.png`, `mobile-splash.png` (and `npm run shot` checks it goes away) |
| C8 | A small, static, colourful Toddler Smash logo stays centred along the top edge during loading, every game and puzzle, the grown-up panel and full screen. It respects safe areas, sits above the game buttons, passes taps through to play, and immediately follows the current mood. | `index.html` (`#edge-logo`), `PlayScene.applyMood`, `main.ts` (fullscreen target) | desktop, mobile, splash, panel and challenge screenshots; browser layout, resize, fullscreen and input checks |

## Sub-games

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| G1 | Several sub-games, one running at a time: **Smash**, **Piano**, **Drawing**. | `modes/` | screenshots |
| G2 | Piano: rainbow keys; the same input always plays the same key; 10 keys on wide screens, 5 to 8 on phones so keys stay finger-sized. | `modes/piano.ts`, `pianoLayout.ts` | `pianoLayout.test.ts`, `piano.png`, `mobile-piano.png` |
| G3 | Drawing: drag to paint with several fingers at once; keys stamp stickers; old drawing fades, so the screen never fills and nothing needs clearing. | `modes/drawing.ts`, `drawingMath.ts` | `drawingMath.test.ts`, `drawing*.png`, `mobile-drawing.png` |
| G4 | **Every sub-game has its own round button** in the top-right corner that the child can tap. Sub-games are never nested inside each other. | `switcher.ts` (one button per entry in `MODES`) | screenshots |
| G5 | The child switches sub-games only by tapping those buttons, never by a key, so mashing can't flip games. The grown-up can hide the buttons. | `PlayScene.handleSmash`, panel `C` | review |
| G6 | Smash includes friendly dinosaurs and sharks in the random tap/click rotation. D always summons a dinosaur and S a shark, alongside the pressed letter. Animals stomp, hop or swim with footprints or bubbles and quiet synthesized voices (including mobile-friendly harmonic overtones for low stomps); Bedtime uses softer colours and slower motion. All effects share the existing sprite and voice caps. | `toys/animals.ts`, `animalTextures.ts`, `audio.ts`, `pool.ts` | animal keyboard/touch/Bedtime screenshots and mash checks |

## Hidden progression

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| H1 | Each game starts in free play. Selecting a firefly at three successive locations reveals its entrance; unrelated input breaks the trail. Once discovered, selecting the entrance reopens it. | `challenges/controller.ts`, `model.ts` | `model.test.ts`, progression screenshots |
| H2 | Each game has three optional tiers with two distinct authored puzzles per tier. Success advances immediately; errors restart only the current attempt. No automatic increase based on elapsed time or total presses. | `challenges/model.ts` | `model.test.ts`, all six rounds in `scripts/progression-pass.mjs` |
| H3 | Smash progresses from silhouette matching to alternating patterns to remembering three shapes; Piano copies two, three, then four notes; Drawing follows straight, bent, then closed routes on a shared 3×3 grid. | `challenges/model.ts`, `controller.ts` | model tests, keyboard and touch progression passes |
| H4 | Every entrance, puzzle, replay, reward and return control supports keyboard, mouse and touch. Arrows move a visible cursor; Space/Enter selects. Drawing arrows paint adjacent grid segments. Outward arrows at the board edge reach picture controls; Tab cycles controls. Held keys remain quiet. | `input.ts`, `challenges/controller.ts`, `layout.ts` | input/layout tests, progression passes |
| H5 | Picture demonstrations animate and sound; replay restarts the demonstration, and play can interrupt it. A back picture or Backspace returns immediately to free play. | `challenges/controller.ts` | progression passes, screenshots |
| H6 | Solving six rounds earns a creative power: Smash connects at most 24 garden stars, recycling the oldest; Piano adds one quiet pentatonic echo after 600 ms with at most four pending echoes and no recursive echoes; Drawing mirrors rainbow strokes and stickers across the canvas centre. | `challenges/controller.ts`, `rewards.ts`, `modes/piano.ts`, `modes/drawing.ts`, `CONFIG.challenges` | reward tests, playground screenshots |
| H7 | Discoveries and completed rounds are independent per game and live only in the current launch. Switching games returns to free play while retaining discoveries; resize and mood changes retain progress. No account or saved progress. | `PlayScene.ts`, `challenges/model.ts` | model tests, switch/resize/mood/reload progression checks |
| H8 | Logical puzzle input arrives before cosmetic throttling, including Bedtime. Unrelated key mashing and simultaneous Drawing fingers cannot accumulate partial solutions. Drawing requires the ordered route, including closure. | `input.ts`, `challenges/controller.ts`, `model.ts` | input/model tests, Bedtime and multi-touch progression checks |

The pacing target is about 20–40 seconds per tier for a child who understands
the puzzle, with no required waiting. Child playtesting must assess discovery,
challenge and pacing; automated checks establish control behaviour only.

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
| P4 | New player (R in the menu) resets discoveries and puzzle progress for every game without relaunching or changing saved settings. | `parentPanel.ts`, `PlayScene.runPanelAction` | model tests, progression pass |

## Platforms

| # | Requirement | Where | Checked by |
| --- | --- | --- | --- |
| W1 | Plays in a desktop browser. Browser shortcuts that don't need a modifier (F5, Tab, Space, quick-find, right-click) are swallowed. | `input.ts` | `input.test.ts` |
| W2 | Plays on phones and tablets: touch, notch-safe layout, readable sizes, no pinch-zoom or scroll. | `safeArea.ts`, `index.html` | `mobile*.png` |
| W3 | Can be added to the home screen and plays full screen and offline. | `vite.config.ts` (PWA) | review |
| W4 | Online browser and home-screen players automatically update after a complete release installs. Check on launch, foreground return, restored navigation, reconnect, and every 60 seconds while visible. Reload once per release, including during play; preserve grown-up settings, reset session progress and drawing. Offline or failed downloads retain the last complete game and retry later. | `webUpdates.ts`, `updates.ts`, `vite.config.ts` | `updates.test.ts`, `npm run test:updates` (legacy migration, repeated releases, lifecycle checks, failed downloads, offline startup, no reload loops) |
| W6 | Each production build has a unique ID, shown only in the grown-up panel and published through uncached `/version.json`. HTML and the service worker revalidate; fingerprinted assets stay immutable. | `vite.config.ts`, `parentPanel.ts`, `netlify.toml` | upgrade checks, panel screenshots, live header/build verification |
| W5 | Publicly hosted at https://toddler-smash.netlify.app with no floating badge or link over the game. | `netlify.toml`, Netlify site settings | manual |
| W7 | Every merge to main automatically deploys the tested web artifact after web, macOS and Windows CI pass. Pull requests never publish. Serialize uploads and skip superseded commits so older CI runs cannot overwrite a newer release. Check the canonical site's published bytes and cache headers; failed verification fails the deploy job. | `.github/workflows/ci.yml`, `scripts/verify-deploy.mjs`, GitHub Actions deployment secret/variable | workflow lint, successful main deployment and live artifact comparison |
| D1 | A Windows and Mac desktop app that a toddler can't leave: blocks the Windows and menu keys, Alt-Tab, Cmd-Q, Cmd-Tab, Spotlight, media keys and similar. Asking for the Mac Accessibility permission is acceptable. | `src-tauri/` | `npm run test:rust`, CI on macOS and Windows |
| D2 | In the desktop app, the grown-up menu's Quit is the only way out. | `src-tauri/src/lib.rs` | review |

## Out of scope

- Blocking what no app can block: Ctrl-Alt-Del, Win-L, the power button,
  and touchpad gestures handled by the OS. The guide explains how to turn
  those off.
- Locking a phone or tablet to the app. Use Guided Access (iOS) or App
  pinning (Android).
- Accounts, scores, saved progress, ads, or online activity beyond loading the
  game. Hidden puzzle progress is session-only.
