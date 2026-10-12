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

  /** Volume, timbre and note length live per mood, in `moods` below. */
  audio: {
    /**
     * C major pentatonic. There are no dissonant intervals in this set, which
     * is the whole trick: a toddler mashing 30 keys at random still produces
     * something that sounds like music instead of noise.
     */
    scaleSemitones: [0, 2, 4, 7, 9],
    rootHz: 261.63, // middle C
    octaves: 3,
  },

  /** The piano sub-game. */
  piano: {
    /** Ten keys so the number row 1..0 maps one-to-one. */
    keys: 10,
    /** Narrow screens (phones) get fewer keys, so each stays finger-sized. */
    minKeys: 5,
    minKeyPx: 60,
    /** Share of screen height the keys take, from the bottom. */
    heightFrac: 0.42,
    gapPx: 10,
  },

  /**
   * Hold this key for `parentHoldMs` to open the grown-up panel. A toddler
   * mashes; they very rarely hold one specific key down for three full seconds.
   */
  parentEscape: {
    key: 'Escape',
    holdMs: 3000,
  },

  /**
   * A mood restyles whichever sub-game is running; the grown-up panel picks
   * one with `panelKey`. "Make bedtime calmer" or "brighter daytime colours"
   * lands here. Every mood must define the same fields.
   */
  moods: {
    /** The default. Bright and clear, but unhurried and never flashing. */
    daytime: {
      label: 'Daytime',
      panelKey: 'D',
      background: { top: 0xdcefff, bottom: 0xfdf3e1 },
      hintColor: '#7a86a8',
      /** Saturated but deep enough to read on a light sky. */
      palette: [0xe63946, 0xf77f00, 0xe0a800, 0x2a9d8f, 0x43aa52, 0x277da1, 0x7b2cbf, 0xd6336c],
      /** Multiplies every tween's speed. Below 1 is slower and floatier. */
      timeScale: 0.9,
      /**
       * Minimum ms between spawns. Faster input is dropped, so a mashed
       * keyboard settles into a steady rhythm instead of a flood.
       */
      minSpawnIntervalMs: 45,
      /** Draw a starry sky and a moon behind everything. */
      night: false,
      audio: { volume: 0.24, wave: 'triangle', noteMs: 620, pianoMs: 1400, octaveShift: 0 },
    },
    /** Dim, slow, low and quiet. Pastels on navy; nothing fast or loud. */
    bedtime: {
      label: 'Bedtime',
      panelKey: 'B',
      background: { top: 0x0b1030, bottom: 0x1d1747 },
      hintColor: '#4b5384',
      palette: [0xf4a7b9, 0xf6c28b, 0xf3e3a0, 0xa8e6cf, 0x9ad0ec, 0xb8b5ff, 0xd7bde2, 0x8fd3c7],
      timeScale: 0.5,
      minSpawnIntervalMs: 160,
      night: true,
      audio: { volume: 0.13, wave: 'sine', noteMs: 1200, pianoMs: 2200, octaveShift: -1 },
    },
  },
} as const

export type MoodName = keyof typeof CONFIG.moods
export type Mood = (typeof CONFIG.moods)[MoodName]

export type Config = typeof CONFIG
