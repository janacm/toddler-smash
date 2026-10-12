/**
 * The touch way into the grown-up panel: one finger on the top-left corner
 * and one on the bottom-right, held together (timing lives in `input.ts`).
 * Opposite corners need two hands, and a toddler's palm on one edge never
 * covers both. Pure, so it's unit-tested without a browser.
 */

export interface Point {
  x: number
  y: number
}

/** Side of each corner zone: a share of the short screen edge, within limits. */
export function cornerSize(width: number, height: number): number {
  return Math.min(Math.max(Math.min(width, height) * 0.14, 56), 110)
}

export function isDiagonalCornerHold(points: Iterable<Point>, width: number, height: number): boolean {
  const size = cornerSize(width, height)
  let topLeft = false
  let bottomRight = false
  for (const p of points) {
    if (p.x <= size && p.y <= size) topLeft = true
    if (p.x >= width - size && p.y >= height - size) bottomRight = true
  }
  return topLeft && bottomRight
}
