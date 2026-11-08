import type { Voice } from '../audio'

export const BADGE_IDS = [
  'dinosaur',
  'shark',
  'rainbow',
  'scratchDino',
  'scratchShark',
  'scratchSky',
] as const

export type BadgeId = (typeof BADGE_IDS)[number]

export const SCRATCH_CARD_IDS = ['dino', 'shark', 'sky'] as const
export type ScratchCardId = (typeof SCRATCH_CARD_IDS)[number]

export interface BadgeDefinition {
  readonly id: BadgeId
  readonly icon: string
  readonly label: string
  readonly voice: Voice
}

export interface ScratchCell {
  readonly col: number
  readonly row: number
}
