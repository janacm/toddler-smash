import type { BadgeDefinition, BadgeId } from './types'

export const BADGES: readonly BadgeDefinition[] = [
  { id: 'dinosaur', icon: 'dinosaur-roar', label: 'Dinosaur', voice: 'dinosaur' },
  { id: 'shark', icon: 'shark-grin', label: 'Shark', voice: 'bubble' },
  { id: 'rainbow', icon: 'badge-icon-rainbow', label: 'Rainbow', voice: 'piano' },
  { id: 'scratchDino', icon: 'badge-icon-leaf', label: 'Leaf', voice: 'dinosaur' },
  { id: 'scratchShark', icon: 'badge-icon-wave', label: 'Wave', voice: 'bubble' },
  { id: 'scratchSky', icon: 'badge-icon-moon', label: 'Moon', voice: 'blip' },
] as const

export class RainbowRun {
  private readonly targetCount: number
  private notes: number[] = []

  constructor(targetCount: number = 5) {
    this.targetCount = targetCount
  }

  get length(): number {
    return this.notes.length
  }

  push(degree: number): boolean {
    const d = ((degree % 5) + 5) % 5
    this.notes.push(d)
    if (this.notes.length > this.targetCount) {
      this.notes.shift()
    }
    if (this.notes.length === this.targetCount) {
      const distinct = new Set(this.notes)
      if (distinct.size === this.targetCount) {
        this.notes = []
        return true
      }
    }
    return false
  }

  reset(): void {
    this.notes = []
  }
}

export class AlbumModel {
  private readonly unlocked = new Set<BadgeId>()

  discover(id: BadgeId): boolean {
    if (this.unlocked.has(id)) return false
    this.unlocked.add(id)
    return true
  }

  has(id: BadgeId): boolean {
    return this.unlocked.has(id)
  }

  getUnlocked(): ReadonlySet<BadgeId> {
    return this.unlocked
  }

  getUnlockedCount(): number {
    return this.unlocked.size
  }

  getBadges(): readonly BadgeDefinition[] {
    return BADGES
  }

  reset(): void {
    this.unlocked.clear()
  }
}
