# toddler-smash

A browser game for a two- and a four-year-old, built so that banging on the
keyboard is the *point* rather than something to be defended against.

Press any key and a giant coloured letter pops out. Press anything else and you
get shapes, ripples, or a googly-eyed blob. Tap or click anywhere and the same
thing happens. Nothing errors, nothing quits, nothing needs precision, and there
is no way to lose.

## Run it

```bash
npm install
npm run dev      # then open http://127.0.0.1:5173
```

For actual toddler use, open the grown-up menu (**hold Escape for 3 seconds**)
and press **F** for fullscreen.

## What makes it mash-proof

- **Nothing to get stuck in.** No menus, no levels, no game over, no dialogs.
  The game boots straight into play and stays there.
- **Hard caps on everything.** Sprites and audio voices are pooled with a fixed
  ceiling, so leaning on the keyboard for ten minutes costs the same as pressing
  one key.
- **Mashing sounds like music.** Every note is quantised to a pentatonic scale,
  which has no dissonant intervals — random input is consonant by construction.
  Pitch follows position, so sweeping a hand across the keyboard plays a run.
- **Browser shortcuts are swallowed.** F5, Tab, space-scroll, quick-find, and
  right-click don't do their usual thing.
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
build-and-screenshot verification loop.
