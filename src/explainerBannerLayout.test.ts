import { describe, expect, it } from 'vitest'
import { explainerBannerPlacement } from './explainerBannerLayout'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }
const IPHONE_INSETS = { top: 47, right: 0, bottom: 34, left: 0 }

describe('explainer banner mobile placement', () => {
  it('fits the complete banner between the game board and tray on tall phones', () => {
    for (const game of ['smash', 'piano', 'drawing'] as const) {
      const placement = explainerBannerPlacement(390, 844, game, 'puzzle', IPHONE_INSETS)

      expect(placement.visible, game).toBe(true)
      expect(placement.y - 25, game).toBeGreaterThanOrEqual(placement.clearFrom + 12)
      expect(placement.y + 25, game).toBeLessThanOrEqual(placement.clearTo - 12)
    }
  })

  it('hides the banner when a short phone has no full-height corridor', () => {
    const piano = explainerBannerPlacement(390, 568, 'piano', 'free', ZERO_INSETS)
    const drawing = explainerBannerPlacement(390, 568, 'drawing', 'puzzle', ZERO_INSETS)
    const smash = explainerBannerPlacement(430, 600, 'smash', 'puzzle', ZERO_INSETS)

    expect(piano.visible).toBe(false)
    expect(drawing.visible).toBe(false)
    expect(smash.visible).toBe(false)
  })

  it('reserves the real tray bounds at wider short portrait widths', () => {
    const placement = explainerBannerPlacement(599, 600, 'drawing', 'playground', ZERO_INSETS)

    expect(placement.visible).toBe(false)
    expect(placement.clearFrom).toBeGreaterThan(placement.clearTo)
  })
})
