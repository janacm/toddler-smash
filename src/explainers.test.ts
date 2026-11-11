import { describe, expect, it } from 'vitest'
import {
  getCurrentExplainer,
  getLevelExplainer,
  getSubGameExplainer,
  SUB_GAME_EXPLAINERS,
} from './explainers'
import type { GameId } from './challenges/model'

describe('SUB_GAME_EXPLAINERS', () => {
  const games: GameId[] = ['smash', 'piano', 'drawing']

  it('has entries for all three sub-games', () => {
    for (const g of games) {
      expect(SUB_GAME_EXPLAINERS[g]).toBeDefined()
      expect(SUB_GAME_EXPLAINERS[g].name).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].icon).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].tagline).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].description).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].freePlay.instruction).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].firefly.instruction).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].playground.instruction).toBeTruthy()
      expect(SUB_GAME_EXPLAINERS[g].playground.power).toBeTruthy()
    }
  })

  it('provides exactly 6 authored levels per game with correct tiers', () => {
    for (const g of games) {
      const explainer = getSubGameExplainer(g)
      expect(explainer.levels).toHaveLength(6)
      explainer.levels.forEach((lvl, i) => {
        expect(lvl.level).toBe(i + 1)
        expect(lvl.tier).toBe(Math.floor(i / 2) + 1)
        expect(lvl.tierName).toBeTruthy()
        expect(lvl.title).toBeTruthy()
        expect(lvl.badge).toBe(`LEVEL ${i + 1} OF 6`)
        expect(lvl.instruction).toBeTruthy()
        expect(lvl.detail).toBeTruthy()
      })
    }
  })
})

describe('getLevelExplainer', () => {
  it('returns each level correctly', () => {
    const l1 = getLevelExplainer('smash', 0)
    expect(l1.level).toBe(1)
    expect(l1.title).toBe('Match Silhouette')

    const l6 = getLevelExplainer('smash', 5)
    expect(l6.level).toBe(6)
    expect(l6.title).toBe('Remember Shapes')
  })

  it('clamps out of bounds indices safely', () => {
    const lNeg = getLevelExplainer('piano', -1)
    expect(lNeg.level).toBe(1)

    const lHigh = getLevelExplainer('piano', 99)
    expect(lHigh.level).toBe(6)
  })
})

describe('getCurrentExplainer', () => {
  it('returns free play explainer when in free play view and no firefly step', () => {
    const exp = getCurrentExplainer('drawing', 'free', 0, 0)
    expect(exp.badge).toBe('FREE PLAY')
    expect(exp.title).toBe('Drawing · Free Play')
    expect(exp.instruction).toContain('paint rainbow trails')
  })

  it('returns firefly explainer when entranceStep > 0 in free play view', () => {
    const exp = getCurrentExplainer('smash', 'free', 0, 1)
    expect(exp.badge).toBe('ENTRANCE')
    expect(exp.title).toBe('Secret Challenge')
    expect(exp.instruction).toContain('firefly')
  })

  it('returns puzzle level explainer when in puzzle view', () => {
    const exp = getCurrentExplainer('piano', 'puzzle', 2, 0)
    expect(exp.badge).toBe('LEVEL 3 OF 6')
    expect(exp.title).toBe('Three-Note Melody')
    expect(exp.instruction).toContain('three-note tune')
  })

  it('returns playground explainer when in playground view or solved >= 6', () => {
    const exp1 = getCurrentExplainer('smash', 'playground', 6)
    expect(exp1.badge).toBe('CREATIVE POWER')
    expect(exp1.title).toBe('Smash · Celestial Garden')
    expect(exp1.instruction).toContain('plant up to 24 connected')

    const exp2 = getCurrentExplainer('drawing', 'free', 6)
    expect(exp2.badge).toBe('CREATIVE POWER')
    expect(exp2.title).toBe('Drawing · Kaleidoscope Mirror')
  })
})
