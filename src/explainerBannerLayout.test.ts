import { describe, expect, it } from 'vitest'
import { explainerBannerPlacement, resolveBannerLayout } from './explainerBannerLayout'
import { switcherLeftEdge } from './switcherLayout'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }
const IPHONE_INSETS = { top: 47, right: 0, bottom: 34, left: 0 }

describe('explainer banner mobile placement', () => {
  it('fits the complete banner between the game board and tray on tall phones', () => {
    for (const game of ['smash', 'piano', 'drawing', 'dance'] as const) {
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

describe('resolveBannerLayout', () => {
  it('places the banner inside the top corridor clear of switcher buttons on desktop', () => {
    for (const width of [1280, 1100]) {
      const layout = resolveBannerLayout(width, 800, 'dance', 'free', ZERO_INSETS, 4)
      expect(layout.visible).toBe(true)
      expect(layout.x - layout.width / 2).toBeGreaterThanOrEqual(160)
      expect(layout.x + layout.width / 2).toBeLessThanOrEqual(switcherLeftEdge(width, 4, ZERO_INSETS) - 14)
    }
  })

  it('keeps the banner on-screen via the lower corridor on medium-width 600x800 viewports', () => {
    const layout = resolveBannerLayout(600, 800, 'dance', 'free', ZERO_INSETS, 4)
    expect(layout.visible).toBe(true)
    expect(layout.x - layout.width / 2).toBeGreaterThanOrEqual(16)
    expect(layout.x + layout.width / 2).toBeLessThanOrEqual(584)
    expect(layout.y).toBeGreaterThan(500)
  })

  it('hides the banner on short medium-width and cramped compact landscape screens', () => {
    const shortMedium = resolveBannerLayout(600, 600, 'drawing', 'puzzle', ZERO_INSETS, 4)
    expect(shortMedium.visible).toBe(false)

    const compactPhone = resolveBannerLayout(844, 390, 'dance', 'free', ZERO_INSETS, 4)
    expect(compactPhone.visible).toBe(false)

    const wideCompact = resolveBannerLayout(1200, 420, 'dance', 'free', ZERO_INSETS, 4)
    expect(wideCompact.visible).toBe(true)
    expect(wideCompact.height).toBe(40)
    expect(wideCompact.x + wideCompact.width / 2).toBeLessThanOrEqual(switcherLeftEdge(1200, 4, ZERO_INSETS) - 14)
  })

  it('uses mobile portrait placement below 600px width', () => {
    const portrait = resolveBannerLayout(390, 844, 'dance', 'free', IPHONE_INSETS, 4)
    expect(portrait.visible).toBe(true)
    expect(portrait.x).toBe(195)
    expect(portrait.width).toBe(340)
  })
})
