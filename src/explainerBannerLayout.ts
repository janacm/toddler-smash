import { CONFIG } from './config'
import { challengeLayout } from './challenges/layout'
import type { GameId } from './challenges/model'
import { switcherLeftEdge } from './switcherLayout'

export interface BannerInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export interface BannerPlacement {
  y: number
  visible: boolean
  clearFrom: number
  clearTo: number
}

export interface ResolvedBannerLayout {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

const BANNER_HEIGHT = 50
const MIN_GAP = 12

/**
 * Find the lower corridor for an explainer. If the complete card and
 * its breathing room cannot fit, suppress it instead of covering game UI.
 */
export function explainerBannerPlacement(
  width: number,
  height: number,
  game: GameId,
  view: 'free' | 'puzzle' | 'playground',
  insets: BannerInsets,
): BannerPlacement {
  const trayStamp = width < 600
    ? CONFIG.discovery.mobileBadgeStampSize
    : CONFIG.discovery.badgeStampSize
  const trayTop = game === 'piano'
    ? height * (1 - CONFIG.piano.heightFrac - 0.04) - trayStamp - 18
    : height - insets.bottom - trayStamp - 18

  let clearFrom: number
  if (game === 'piano') {
    // Keep clear of the companion and piano prompts in the upper deck.
    clearFrom = insets.top + (view === 'free' ? 215 : 260)
  } else {
    const board = challengeLayout(width, height, game, insets)
    const bottomNode = board.nodes[6]
    // Smash & Dance choices use 1.35× nodes. Drawing highlights can reach the node
    // radius; reserve another 8px for the keyboard focus ring.
    const nodeExtent = game === 'smash' || game === 'dance' ? board.radius * 1.35 : board.radius + 8
    clearFrom = bottomNode.y + nodeExtent
  }

  const clearTo = trayTop
  const fits = clearTo - clearFrom >= BANNER_HEIGHT + MIN_GAP * 2
  return {
    y: Math.round((clearFrom + clearTo) / 2),
    visible: fits,
    clearFrom,
    clearTo,
  }
}

/**
 * Compute full viewport-safe placement for the explainer banner across phone,
 * medium-width, desktop, and compact landscape screens without overlapping the
 * companion or mode switcher buttons.
 */
export function resolveBannerLayout(
  width: number,
  height: number,
  game: GameId,
  view: 'free' | 'puzzle' | 'playground',
  insets: BannerInsets,
  modeCount: number,
): ResolvedBannerLayout {
  const compact = height < 500
  const isPortraitPhone = width < 600 && height >= 500

  if (isPortraitPhone) {
    const placement = explainerBannerPlacement(width, height, game, view, insets)
    return {
      x: width / 2,
      y: placement.y,
      width: Math.min(340, Math.max(0, width - insets.left - insets.right - 32)),
      height: BANNER_HEIGHT,
      visible: placement.visible,
    }
  }

  const leftBound = insets.left + 160
  const rightBound = switcherLeftEdge(width, modeCount, insets) - 14
  const topRoom = rightBound - leftBound
  const minTopWidth = compact ? 260 : 320

  if (topRoom >= minTopWidth) {
    const bannerW = Math.min(compact ? 420 : 380, topRoom)
    const bannerH = compact ? 40 : BANNER_HEIGHT
    const bannerX = Math.max(leftBound + bannerW / 2, Math.min(width / 2, rightBound - bannerW / 2))
    return {
      x: bannerX,
      y: insets.top + (compact ? 34 : 64),
      width: bannerW,
      height: bannerH,
      visible: true,
    }
  }

  if (!compact) {
    const placement = explainerBannerPlacement(width, height, game, view, insets)
    return {
      x: width / 2,
      y: placement.y,
      width: Math.min(380, Math.max(0, width - insets.left - insets.right - 32)),
      height: BANNER_HEIGHT,
      visible: placement.visible,
    }
  }

  return {
    x: width / 2,
    y: insets.top + 34,
    width: Math.min(420, width * 0.6),
    height: 40,
    visible: false,
  }
}
