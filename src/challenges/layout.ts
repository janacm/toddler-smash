import type { GameId } from './model'

export interface Point { x: number; y: number }
export interface BoardLayout {
  nodes: Point[]
  choices: Point[]
  perches: Point[]
  back: Point
  replay: Point
  promptY: number
  radius: number
}

/** Shared by the renderer, hit testing, keyboard pen, and browser checks. */
export function challengeLayout(
  width: number, height: number, game: GameId,
  inset = { top: 0, right: 0, bottom: 0, left: 0 },
): BoardLayout {
  const compact = height < 500
  const left = inset.left + (width - inset.left - inset.right) * 0.2
  const right = width - inset.right - (width - inset.left - inset.right) * 0.2
  const top = compact ? height * 0.42 : Math.max(inset.top + 230, height * 0.3)
  const bottom = compact ? height - inset.bottom - 35
    : game === 'piano' ? height * 0.54 - 30
      : Math.min(height - inset.bottom - 100, top + Math.min(width, height) * 0.52)
  const nodes = Array.from({ length: 9 }, (_, i) => ({
    x: left + (i % 3) * (right - left) / 2,
    y: top + Math.floor(i / 3) * Math.max(60, bottom - top) / 2,
  }))
  const controlY = compact ? 128 : inset.top + 152
  return {
    nodes,
    choices: [nodes[3], nodes[4], nodes[5]],
    perches: [nodes[0], nodes[2], nodes[6]],
    back: { x: inset.left + 40, y: controlY },
    replay: { x: width - inset.right - 40, y: controlY },
    promptY: compact ? 125 : top - 55,
    radius: Math.max(22, Math.min(34, (right - left) / 7)),
  }
}

export function moveNode(node: number, key: string): number {
  const col = node % 3
  const row = Math.floor(node / 3)
  if (key === 'ArrowLeft') return row * 3 + Math.max(0, col - 1)
  if (key === 'ArrowRight') return row * 3 + Math.min(2, col + 1)
  if (key === 'ArrowUp') return Math.max(0, row - 1) * 3 + col
  if (key === 'ArrowDown') return Math.min(2, row + 1) * 3 + col
  return node
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/** Include crossed waypoints even when a device coalesces pointer moves. */
export function crossedNodes(from: Point, to: Point, nodes: readonly Point[], radius: number): number[] {
  return nodes.map((p, i) => ({ p, i }))
    .filter(({ p }) => distanceToSegment(p, from, to) <= radius)
    .sort((a, b) => Math.hypot(a.p.x - from.x, a.p.y - from.y) - Math.hypot(b.p.x - from.x, b.p.y - from.y))
    .map(({ i }) => i)
}

export function hit(point: Point, target: Point, radius: number): boolean {
  return Math.hypot(point.x - target.x, point.y - target.y) <= radius
}
