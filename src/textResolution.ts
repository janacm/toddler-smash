/** Minimum text canvas density for legible labels on high-DPI displays. */
export function textResolution(): number {
  if (typeof window === 'undefined') return 3
  return Math.max(window.devicePixelRatio || 1, 3)
}

export const SYSTEM_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
