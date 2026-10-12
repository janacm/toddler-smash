# Desktop app

The desktop app is the same game in a full-screen window that a toddler can't
get out of. It blocks the operating-system shortcuts a browser can't: the
Windows key, Alt-Tab, Cmd-Q, Cmd-Tab, Spotlight, media keys, and so on. It's
built with [Tauri 2](https://tauri.app) in `src-tauri/`.

The only way out is the grown-up menu: **hold Escape for 3 seconds, then press
Q.** Closing the window and the usual quit shortcuts are refused.

## First run on a Mac

1. Open the app. macOS asks to allow **Toddler Smash** to control the
   computer using accessibility features. Click **Open System Settings**.
2. In **Privacy & Security → Accessibility**, turn on Toddler Smash.
3. Within a couple of seconds the lock engages on its own: the Dock and menu
   bar disappear and the window covers the screen.

Until the permission is granted the app stays escapable on purpose, so you
can reach System Settings. The grown-up menu shows **Keyboard lock · on** once
it's working.

Rebuilding the app in development can make macOS treat it as a new app. If
the lock stops engaging after a rebuild, remove Toddler Smash from the
Accessibility list and add it again.

## First run on Windows

No permission is needed. The lock is active as soon as the window opens.

Windows may show a SmartScreen warning ("Windows protected your PC") because
the app isn't code-signed yet. Click **More info → Run anyway**.

## What's blocked

| | Windows | macOS |
| --- | --- | --- |
| OS key | Windows keys, menu key | Cmd, Ctrl, Option and Fn are stripped from every key, so Cmd-Q arrives as plain Q |
| Switching apps | Alt-Tab, Alt-Esc | Cmd-Tab, plus app switching turned off |
| Closing | Alt-F4, Alt-Space menu | Cmd-Q, Cmd-W, no app menu |
| System menus | Ctrl-Esc (Start), Ctrl-Shift-Esc (Task Manager) | Spotlight, Force Quit (Cmd-Option-Esc), Apple menu |
| Special keys | Volume, media, browser, mail and sleep keys | Volume, brightness, media, Launchpad, Mission Control, Dictation, Globe |
| Accessibility pop-ups | Sticky Keys (Shift ×5), Filter Keys (hold right Shift), Toggle Keys (hold Num Lock), restored on quit | n/a |
| Desktop chrome | Covered by a full-screen, always-on-top window | Dock and menu bar hidden |

## What can't be blocked

No app can block these, on purpose, so the computer can't be held hostage:

- **Ctrl-Alt-Del** and **Win-L** on Windows. Both show the lock or security
  screen, which is harmless; log back in and the game is still running.
- **The power button** and Touch ID on any computer.
- **Touchpad gestures.** Turn them off before playtime; see the
  [grown-up guide](grown-ups.md#before-you-hand-over-the-computer).

## If you get stuck

- **The grown-up menu won't open:** make sure you're holding only Escape, for
  a full 3 seconds.
- **The game froze (Windows):** Ctrl-Alt-Del → Task Manager → end Toddler
  Smash. Sticky Keys settings are restored on a normal quit; after a crash,
  check Settings → Accessibility → Keyboard.
- **The game froze (Mac):** Force Quit is disabled while the game runs. Hold
  the power button to restart, or from another device run
  `ssh you@your-mac "pkill -fi 'toddler.smash'"`.

## Building

You need Node 20+ and [Rust](https://rustup.rs). On Windows you also need the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) (WebView2 and
the MSVC build tools).

```bash
npm install
npm run desktop:dev    # native window with hot reload
npm run desktop:build  # installers in src-tauri/target/release/bundle/
```

`desktop:build` produces a `.app` and `.dmg` on a Mac, and an `.msi` and
setup `.exe` on Windows. Build each platform on that platform.

Not set up yet: Apple Developer ID signing and notarization, and a Windows
code-signing certificate. Until then, the first time a Mac opens a build from
another machine, macOS blocks it; approve it under System Settings → Privacy &
Security → **Open Anyway**.

## How it works

```
src-tauri/src/
  lib.rs              window setup, refuses close/exit unless `quit` was called
  lockdown/
    rules.rs          the block/allow decisions, as pure functions + unit tests
    mac.rs            CGEventTap + kiosk presentation options
    win.rs            WH_KEYBOARD_LL hook + Sticky/Filter/Toggle Keys
```

- **Windows:** a low-level keyboard hook sees every key before Windows does
  and drops the blocked ones, but only while the game's window is in front.
- **macOS:** a session event tap sees every key before macOS acts on it. It
  strips system modifiers rather than dropping the key, so the child still
  gets a letter when they lean on Cmd. Kiosk presentation options hide the
  Dock and menu bar and disable app switching and Force Quit.
- **Both:** `rules.rs` holds the decisions as plain functions of key codes
  and modifier flags, so `npm run test:rust` checks both platforms' rules on
  any machine.

The web game knows it's in the desktop app via `src/desktop.ts`. There, it
also swallows modifier shortcuts inside the page and adds Q (Quit) to the
grown-up menu.

To block another key, add it to the rules in `rules.rs` and add a test next
to the existing ones.
