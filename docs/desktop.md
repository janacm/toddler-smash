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

When signed with an Authenticode certificate, the installer displays the verified
publisher name. On initial release with a new certificate, Windows Defender SmartScreen
may display a informational prompt until the certificate establishes download reputation;
click **More info → Run anyway**. Development builds without a certificate will show
"Unknown publisher".

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
setup `.exe` on Windows. Build each platform on that platform. For local builds
without signing certificates configured, pass `-- --no-sign` to skip signing:

```bash
npm run desktop:build -- --no-sign
```

## Code signing and releases

Both macOS Gatekeeper and Windows Defender SmartScreen enforce security gates for
applications downloaded from the web. Without valid code signing and notarization,
operating systems flag packages as untrusted or block execution.

> [!IMPORTANT]
> **Code signing vs. Accessibility on macOS**: Code signing and Apple notarization
> allow macOS Gatekeeper to trust the downloaded `.dmg` and `.app` without
> security warnings. However, the **Accessibility permission** (needed by `CGEventTap`
> to swallow OS-level shortcuts) is an independent privacy boundary governed by TCC
> (Transparency, Consent, and Control). Parents must still grant Accessibility
> permission in **System Settings → Privacy & Security → Accessibility** on first launch.

### macOS: Apple Developer ID Signing and Notarization

macOS distribution requires three components:
1. **Developer ID Application Certificate**: A cryptographic identity issued under the Apple Developer Program.
2. **Hardened Runtime & Entitlements**: Configured in `src-tauri/tauri.conf.json` (`hardenedRuntime: true`) with JIT entitlements in `src-tauri/entitlements.plist` (`com.apple.security.cs.allow-jit`, `com.apple.security.cs.allow-unsigned-executable-memory`).
3. **Apple Notarization & Stapling**: Submitting the built `.app` and `.dmg` to Apple's Notary service (`xcrun notarytool`) and attaching the cryptographic ticket (`xcrun stapler`).

#### GitHub Actions CI Setup

The CI workflow `.github/workflows/ci.yml` automates signing and notarization on `macos-latest` runners whenever signing secrets are present in the repository. If secrets are not present (e.g. pull requests from external forks), CI automatically builds unsigned packages with `--no-sign` for build validation.

Required GitHub Repository Secrets:
- `APPLE_CERTIFICATE`: Base64-encoded string of your exported `.p12` file containing the Developer ID Application certificate and private key.
  ```bash
  # In Keychain Access: export Developer ID certificate as .p12, then:
  base64 -i Certificate.p12 | pbcopy
  ```
- `APPLE_CERTIFICATE_PASSWORD`: The password chosen when exporting the `.p12` file.
- `APPLE_SIGNING_IDENTITY`: The exact identity name from Apple Developer (e.g., `Developer ID Application: Your Name (TEAM_ID)`).
- `APPLE_ID`: Your Apple Developer Apple ID email address.
- `APPLE_PASSWORD`: An App-Specific Password generated at [appleid.apple.com](https://appleid.apple.com).
- `APPLE_TEAM_ID`: The 10-character Team ID from your Apple Developer account profile.
- `KEYCHAIN_PASSWORD`: (Optional) Temporary password for the runner's ephemeral keychain.
- *(Alternative to Apple ID + App Password)*: `APPLE_API_KEY` (base64 string or file path), `APPLE_API_ISSUER`, and `APPLE_API_KEY_ID` for App Store Connect API keys.

#### Alternative Notarization Tool: gon

For pipelines or local environments using `gon` (Mitchell Hashimoto's macOS notarization CLI), a pre-configured `gon.json` is provided in the repository root:

```bash
# Install gon
brew install mitchellh/gon/gon

# Set environment credentials
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"

# Build and run gon
npm run desktop:build -- --no-sign
gon gon.json
```

`gon` signs `src-tauri/target/release/bundle/macos/Toddler Smash.app`, packages it into `Toddler Smash.dmg` and `Toddler-Smash-macOS.zip`, uploads to Apple Notary API, polls for status, and staples the notarization ticket.

#### Local macOS Signing & Verification

If your Developer ID certificate is installed in your macOS login keychain:

```bash
# Build, sign, and package
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)" npm run desktop:build

# Submit dmg to Apple notarytool
xcrun notarytool submit "src-tauri/target/release/bundle/dmg/Toddler Smash_0.1.0_aarch64.dmg" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait

# Staple ticket
xcrun stapler staple "src-tauri/target/release/bundle/dmg/Toddler Smash_0.1.0_aarch64.dmg"

# Verify signature and Gatekeeper acceptance
spctl --assess --type execute --verbose "src-tauri/target/release/bundle/macos/Toddler Smash.app"
codesign --verify --deep --strict --verbose=2 "src-tauri/target/release/bundle/macos/Toddler Smash.app"
```

---

### Windows: Authenticode Code Signing

Windows requires Authenticode signatures using SHA-256 and RFC 3161 timestamps. Tauri's `src-tauri/tauri.conf.json` is configured with:
- `"digestAlgorithm": "sha256"`
- `"timestampUrl": "http://timestamp.digicert.com"`
- `"tsp": true`

Two signing workflows are supported:

#### 1. PFX Certificate Secret (Traditional OV / EV)

Export your code-signing certificate and private key to a password-protected `.pfx` file and store as GitHub repository secrets:
- `WINDOWS_CERTIFICATE`: Base64 string of the `.pfx` certificate.
  ```powershell
  # Windows PowerShell:
  [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("cert.pfx")) | Set-Clipboard
  ```
  ```bash
  # macOS / Linux:
  base64 -i cert.pfx | tr -d '\n' | pbcopy
  ```
- `WINDOWS_CERTIFICATE_PASSWORD`: Password for the `.pfx` file.
- `WINDOWS_CERTIFICATE_THUMBPRINT`: (Optional) SHA-1 thumbprint if selecting an installed certificate.

In CI, the runner imports the certificate into the `Cert:\CurrentUser\My` store, and `npm run desktop:build` automatically signs both `.msi` and `.exe` binaries with `signtool.exe`.

#### 2. Microsoft Trusted Signing (Cloud HSM / Azure)

Microsoft Trusted Signing (formerly Azure Trusted Signing) is the modern cloud-based HSM signing service that eliminates physical tokens and secret exposure.

Required GitHub Repository Secrets:
- `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`: Azure Service Principal credentials.
- `AZURE_TRUSTED_SIGNING_ENDPOINT`: Regional endpoint URI (e.g. `https://eus.codesigning.azure.net`).
- `AZURE_TRUSTED_SIGNING_ACCOUNT`: Trusted Signing account name.
- `AZURE_TRUSTED_SIGNING_PROFILE`: Certificate profile name.

CI builds unsigned installers (`npm run desktop:build -- --no-sign`), then invokes `azure/trusted-signing-action` to sign the `.msi` and `.exe` artifacts with cloud HSM keys.

#### Local Windows Signing & Verification

On Windows with the Windows SDK installed:

```powershell
# Sign with .pfx
signtool.exe sign /f cert.pfx /p "<password>" /fd sha256 /tr http://timestamp.digicert.com /td sha256 "src-tauri\target\release\bundle\nsis\*.exe"
signtool.exe sign /f cert.pfx /p "<password>" /fd sha256 /tr http://timestamp.digicert.com /td sha256 "src-tauri\target\release\bundle\msi\*.msi"

# Verify signature
signtool.exe verify /pa /v "src-tauri\target\release\bundle\nsis\*.exe"
```

---

### Gatekeeper and SmartScreen Expectations

| Platform | Build State | User Experience on First Launch |
| :--- | :--- | :--- |
| **macOS** | **Signed & Notarized** | Opens cleanly with standard dialog: *"Toddler Smash is an app downloaded from the Internet. Are you sure you want to open it?"* Click **Open**. Accessibility prompt appears next. |
| **macOS** | **Unsigned / Unnotarized** | Gatekeeper quarantine blocks launch: *"Toddler Smash cannot be opened because the developer cannot be verified"*. Requires manual override: **System Settings → Privacy & Security → Open Anyway**. |
| **Windows** | **Signed (Trusted Signing or EV)** | Opens immediately without SmartScreen warning. Instant positive reputation. |
| **Windows** | **Signed (New Standard OV)** | SmartScreen displays informational warning until the certificate establishes download volume reputation across Windows Defender telemetry. Dialog lists **Publisher: [Verified Name]**; parent clicks **More info → Run anyway**. |
| **Windows** | **Unsigned** | SmartScreen displays blue warning: *"Windows protected your PC: Unknown publisher"*. Parent must click **More info → Run anyway**. |

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
