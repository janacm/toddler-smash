# Playtest Feedback & Field Notes

Real-world observations from playing **Toddler Smash** with our 2-year-old and 4-year-old.
For the structured observational rubric and pacing benchmarks, see [playtesting.md](playtesting.md).

---

## 2026-11-14 — Animated Idle Hints & Laptop vs. Touch Screen (2yo)

**Context**: Testing the new animated idle hints (firefly shake/glow/arrow after 5s, puzzle target bounce/arrows) on both a laptop and a touch-screen device with the 2-year-old.

### Observations
- **Animated hints work well**: The shaking firefly, pulsing halo, and bouncing arrows noticeably help draw attention to what to interact with next without needing any text or verbal prompting.
- **Laptop screen-touching**: On a non-touch laptop, the 2-year-old repeatedly reaches out and tries to tap the screen directly (especially at the firefly, animals, and puzzle choices) instead of using the keyboard or trackpad.
- **Touch screen is a much better fit at age 2**: Direct touch interaction on a phone/tablet produces far better results—immediate cause-and-effect, fewer missed targets, and much less frustration than translating between a keyboard/trackpad and a vertical screen.

### Takeaways / Future Ideas
- **Primary recommendation for 2yo**: Prefer touch-screen devices (tablet/phone, or Guided Access / home-screen PWA install) over a standard laptop when possible.
- **On laptops/desktops**: Keyboard mashing in Smash and Piano works naturally for sensory play, while pointer-targeted interactions (firefly discovery, Drawing routes, Smash puzzle choices) are inherently much harder for a 2-year-old without a touch screen.
- **Potential future exploration**:
  - Consider whether a keyboard-friendly way to interact with the firefly or choices (beyond arrow-key cursor navigation) would help laptop play, without re-introducing accidental keyboard mode-switching.
  - **Production telemetry & feedback**: If adding prod analytics to see how players interact (e.g., touch vs. laptop firefly unlock rates, puzzle drop-offs), keep it **cookieless, zero-PII, and aggregated per-session** (e.g. `navigator.sendBeacon()` on `pagehide` to Umami/Plausible or a Netlify Function) so no cookie consent banner traps a 2-year-old and offline PWA play is never affected. A grown-up-only "Send Feedback" link in the Grown-up Panel can capture qualitative notes right after play.

---

## Template for Future Notes

```markdown
## YYYY-MM-DD — Short Title (Age / Device)

**Context**: What mode, mood, or feature was being tested and on what device.

### Observations
- ...

### Takeaways / Future Ideas
- ...
```
