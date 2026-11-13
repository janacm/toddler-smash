import { CONFIG } from './config'
import { challengeLayout } from './challenges/layout'
import type { GameId } from './challenges/model'

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

const BANNER_HEIGHT = 50
const MIN_GAP = 12

/**
 * Find the lower mobile corridor for an explainer. If the complete card and
 * its breathing room cannot fit, suppress it instead of covering game UI.
 */
export function explainerBannerPlacement(
  width: number,
  height: number,
  game: GameId,
  view: 'free' | 'puzzle' | 'playground',
  insets: BannerInsets,
): BannerPlacement {
  const trayStamp = CONFIG.discovery.mobileBadgeStampSize
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
    // Smash choices use 1.35× nodes. Drawing highlights can reach the node
    // radius; reserve another 8px for the keyboard focus ring.
    const nodeExtent = game === 'smash' ? board.radius * 1.35 : board.radius + 8
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
