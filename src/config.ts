/**
 * Every tunable number in the game lives here.
 *
 * If you are an agent making a change like "make it slower", "more confetti",
 * "calmer colours" — try this file first. Most requests are a number here, not
 * new code.
 */

export const CONFIG = {
  /**
   * Mash safety. These are the numbers that keep a two-year-old leaning on the
   * keyboard from turning into a stutter or a memory leak.
   */
  limits: {
    /** Hard ceiling on live sprites. Oldest is recycled past this. */
    maxSprites: 140,
    /** Hard ceiling on simultaneous audio voices. Prevents clipping. */
    maxVoices: 8,
    /**
     * Minimum ms between spawns. Input faster than this still makes a sound
     * and still counts, it just reuses the last visual burst. Set to 0 to let
     * every single event spawn (not recommended on low-end tablets).
     */
    minSpawnIntervalMs: 45,
  },

  /** How long things live on screen before they fade themselves out. */
  lifetime: {
    glyphMs: 2600,
    shapeMs: 2200,
    rippleMs: 900,
  },

  /** Motion feel. Bigger = floatier. */
  motion: {
    gravity: 420,
    burstSpeedMin: 180,
    burstSpeedMax: 460,
    spinMax: 220,
    bounceDamping: 0.62,
  },

  audio: {
    /** Master volume, 0..1. */
    volume: 0.28,
    /**
     * C major pentatonic. There are no dissonant intervals in this set, which
     * is the whole trick: a toddler mashing 30 keys at random still produces
     * something that sounds like music instead of noise.
     */
    scaleSemitones: [0, 2, 4, 7, 9],
    rootHz: 261.63, // middle C
    octaves: 3,
    noteMs: 620,
  },

  /**
   * Hold this key for `parentHoldMs` to open the grown-up panel. A toddler
   * mashes; they very rarely hold one specific key down for three full seconds.
   */
  parentEscape: {
    key: 'Escape',
    holdMs: 3000,
  },

  /** High-contrast, high-saturation. Toddler vision prefers bold over subtle. */
  palette: [
    0xff4d6d, // red
    0xff9f1c, // orange
    0xffd23f, // yellow
    0x38b000, // green
    0x00b4d8, // cyan
    0x4361ee, // blue
    0x9b5de5, // purple
    0xff70a6, // pink
  ],

  background: {
    top: 0x10131c,
    bottom: 0x1b2033,
  },
} as const

export type Config = typeof CONFIG
