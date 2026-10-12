import { CONFIG, type Mood, type MoodName } from './config'

/**
 * What the grown-up has picked: sub-game, mood, and whether the child's corner
 * buttons are shown. Saved to localStorage so the desktop app comes back the
 * way it was left. Unreadable or stale storage silently falls back to defaults.
 */
export interface Settings {
  mode: string
  mood: MoodName
  childCanSwitch: boolean
}

const STORAGE_KEY = 'toddler-smash:settings'
const DEFAULTS: Settings = { mode: 'smash', mood: 'daytime', childCanSwitch: true }

export const settings: Settings = load()

export function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* private mode or storage full: settings just won't persist */
  }
}

export function currentMood(): Mood {
  return CONFIG.moods[settings.mood]
}

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      mode: typeof raw.mode === 'string' ? raw.mode : DEFAULTS.mode,
      mood: Object.hasOwn(CONFIG.moods, raw.mood) ? raw.mood : DEFAULTS.mood,
      childCanSwitch: typeof raw.childCanSwitch === 'boolean' ? raw.childCanSwitch : DEFAULTS.childCanSwitch,
    }
  } catch {
    return { ...DEFAULTS }
  }
}
