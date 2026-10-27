# toddler-smash

A browser game for a two- and a four-year-old, built for keyboard mashing,
musical play and hidden puzzles.

Free play responds to keys, taps and clicks with giant coloured letters,
shapes, ripples, googly-eyed blobs, dinosaurs and sharks. There is no way to lose. Curious players
can follow a firefly to discover optional puzzles and earn creative powers.

**Play it:** [toddler-smash.netlify.app](https://toddler-smash.netlify.app).
It works on phones and tablets too: add it to the home screen and it runs
full screen and offline.

Online browser and home-screen installs update automatically on opening,
returning, reconnecting, and once a minute while visible. A complete update
reloads during play, retaining grown-up settings and resetting the current
drawing and puzzle progress. Offline or failed downloads keep the last
complete version. The grown-up panel shows its build ID.

Merging to `main` automatically publishes to Netlify after CI passes on web,
macOS and Windows. Deployment uses the tested build, skips superseded commits,
and verifies the published files on the live site. No manual deploy is needed.

## Run it

```bash
npm install
npm run dev      # then open http://127.0.0.1:5173
```

For actual toddler use, open the grown-up menu (**hold Escape for 3 seconds**,
or on a touch screen **hold the top-left and bottom-right corners for 3
seconds**) and choose Full screen.

## Sub-games and moods

- **Smash**: letters, shapes, ripples and critters, including stomping dinosaurs
  and swimming sharks. Press **D** or **S** to call an animal, or meet them by tapping.
- **Piano**: ten rainbow keys. The number row plays them 1 to 0, letters play
  the key under them, and taps play the key they land on.
- **Drawing**: finger-paint rainbow lines that hum as they go; keys stamp
  letters and shapes. Old drawing fades, so there's nothing to clear.

Each runs in a **Daytime** mood (bright and calm) or a **Bedtime** mood
(starry navy sky, pastels, slow motion, soft low notes). In the grown-up menu,
press **1**/**2**/**3** to pick a game, **D**/**B** to pick a mood, and **C** to
show or hide the round corner buttons that let the child switch games
themselves. Choices are remembered. The full parent guide, including what to
set up before playtime, is in [docs/grown-ups.md](docs/grown-ups.md).

## Hidden progression

Follow the firefly through three locations in any game to reveal its entrance.
Each game has two authored puzzles in each of three tiers:

- **Smash:** silhouette matching, alternating patterns, then shape memory.
  Complete all six to place stars that connect into a garden, capped at 24.
- **Piano:** copy two, three, then four notes. Earn quiet echoes after 600 ms,
  capped at four pending echoes.
- **Drawing:** trace straight paths, bent paths, then closed shapes on a 3×3
  grid. Earn mirrored rainbow strokes and stickers.

No timers or written instructions. Incorrect answers restart the current
attempt; the back picture or Backspace returns to free play. Arrows move a
visible cursor, Space/Enter selects, and Drawing arrows paint between adjacent
dots. Pointer players can tap or drag. Piano retains its note mapping.

Progress is independent per game and lasts only for the current launch.
Switching games starts in free play and keeps discoveries; reload clears them.
**New player** (**R** in the grown-up menu) resets progress without relaunching.

## Desktop app

`npm run desktop:build` builds a Mac or Windows app (needs Rust). It fills
the screen and blocks the Windows key, Alt-Tab, Cmd-Q, Cmd-Tab, Spotlight,
media keys and so on. On a Mac it asks for the Accessibility permission once.
Quit from the grown-up menu with **Q**. See [docs/desktop.md](docs/desktop.md)
for setup, what can't be blocked, and troubleshooting.

## Checks

```bash
npm run build      # types + bundle
npm test           # unit tests
npm run test:coverage  # unit tests + coverage gate (what CI runs)
npm run test:updates # real cached-installation upgrades, offline and recovery
npm run test:rust  # desktop keyboard-lock rules
npm run shot       # headless screenshots in shots/, fails on console errors
```

CI runs all of these on every pull request.

The update check serves successive builds at the same address with service
workers enabled and browser storage retained. It verifies legacy migration,
automatic reloads, lifecycle checks, offline startup and failed-download recovery.

The screenshot run includes keyboard and touch progression through all six
puzzles and each reward, plus Bedtime input, replay, reset and reload checks.
Inspect `challenge-*.png`, `mobile-challenge-*.png` and
`bedtime-challenge-piano-*.png`. Child playtesting is still needed to assess
discovery and the target pacing of roughly 20–40 seconds per tier.

## What makes it mash-proof

- **Free play is always available.** The game boots into play; optional puzzle
  tiers have a picture-based return and no game over or dialogs.
- **Hard caps on everything.** Sprites and audio voices are pooled with a fixed
  ceiling, so leaning on the keyboard for ten minutes costs the same as pressing
  one key.
- **Mashing sounds like music.** Every note is quantised to a pentatonic scale,
  which has no dissonant intervals — random input is consonant by construction.
  Pitch follows position, so sweeping a hand across the keyboard plays a run.
- **Browser shortcuts are swallowed.** F5, Tab, space-scroll, quick-find, and
  right-click cannot trigger browser actions; puzzle controls use Tab safely.
- **Held keys don't machine-gun.** A forearm across the keyboard gives one burst
  per key, then silence.
- **Errors never surface.** Anything that throws is caught, logged for the
  grown-ups, and the game keeps drawing.
- **A grown-up exit that a toddler won't find.** Holding one specific key for
  three straight seconds is well outside what random mashing produces.

## Extending it

Every visual effect is a self-contained "toy" in `src/toys/`. Adding one is a
new file plus one line in the registry. All artwork is drawn in code and all
sound is synthesized — there are no binary assets anywhere in the repo, which
means an AI agent can read and modify every part of how the game looks and
sounds.

See [AGENTS.md](AGENTS.md) for architecture, conventions, and the
build-and-screenshot verification loop, and
[docs/requirements.md](docs/requirements.md) for what the game must do.
