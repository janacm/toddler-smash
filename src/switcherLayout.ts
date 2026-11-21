export interface SwitcherInsets {
  top: number
  right: number
  left?: number
}

export interface SwitcherLayout {
  radius: number
  spacing: number
  marginRight: number
  y: number
  centers: number[]
}

const DEFAULT_RADIUS = 46
const DEFAULT_SPACING = 108
const DEFAULT_MARGIN = 26
const TOP_MARGIN = 26
const NARROW_WIDTH = 520
const NARROW_RADIUS = 34
const NARROW_SPACING = 86
const NARROW_MARGIN = 20

/**
 * Compute responsive top-right mode-switcher button coordinates that always fit
 * inside the available viewport width including safe-area insets.
 */
export function computeSwitcherLayout(
  width: number,
  count: number,
  inset: SwitcherInsets = { top: 0, right: 0, left: 0 },
): SwitcherLayout {
  const safeLeft = inset.left ?? 0
  const safeRight = inset.right
  const available = Math.max(0, width - safeLeft - safeRight)
  const narrow = width < NARROW_WIDTH

  let radius = narrow ? NARROW_RADIUS : DEFAULT_RADIUS
  let spacing = narrow ? NARROW_SPACING : DEFAULT_SPACING
  let marginRight = narrow ? NARROW_MARGIN : DEFAULT_MARGIN
  const minLeftPad = narrow ? 12 : 20

  const needed = count > 0 ? minLeftPad + marginRight + radius * 2 + (count - 1) * spacing : 0
  if (count > 0 && needed > available) {
    const fit = available / needed
    marginRight = Math.max(8, Math.floor(marginRight * fit))
    const marginLeft = Math.max(8, Math.floor(minLeftPad * fit))
    radius = Math.max(18, Math.floor(radius * fit))
    const innerSpan = Math.max(0, available - marginLeft - marginRight)
    if (count > 1) {
      spacing = Math.floor(Math.max(0, innerSpan - radius * 2) / (count - 1))
      if (spacing < radius * 2) {
        radius = Math.max(14, Math.floor(innerSpan / (count * 2 + (count - 1) * 0.12)))
        spacing = Math.floor(Math.max(0, innerSpan - radius * 2) / (count - 1))
      }
    } else {
      spacing = 0
    }
  }

  const y = inset.top + TOP_MARGIN + radius
  const centers = Array.from(
    { length: count },
    (_, i) => width - safeRight - marginRight - radius - (count - 1 - i) * spacing,
  )
  return { radius, spacing, marginRight, y, centers }
}

/** Leftmost horizontal edge occupied by the switcher buttons. */
export function switcherLeftEdge(
  width: number,
  count: number,
  inset: SwitcherInsets = { top: 0, right: 0, left: 0 },
): number {
  const layout = computeSwitcherLayout(width, count, inset)
  if (layout.centers.length === 0) return width - inset.right
  return layout.centers[0] - layout.radius
}
