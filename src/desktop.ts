import { invoke, isTauri } from '@tauri-apps/api/core'

/**
 * True inside the Tauri desktop app (`src-tauri/`), false in a browser. The
 * desktop app has no tab to close and blocks the OS quit shortcuts, so the
 * grown-up panel is the only way out there.
 */
export const isDesktop = isTauri()

export function quitApp(): void {
  invoke('quit').catch(() => {})
}

/** Whether the native keyboard lock is running (Mac: needs Accessibility). */
export async function keyboardLocked(): Promise<boolean> {
  return invoke<boolean>('keyboard_locked').catch(() => false)
}
