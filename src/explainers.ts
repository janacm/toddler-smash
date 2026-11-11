import type { GameId } from './challenges/model'

export interface LevelExplainer {
  level: number
  tier: number
  tierName: string
  title: string
  badge: string
  instruction: string
  detail: string
}

export interface SubGameExplainer {
  id: GameId
  name: string
  icon: string
  tagline: string
  description: string
  freePlay: {
    title: string
    badge: string
    instruction: string
    detail: string
  }
  firefly: {
    title: string
    badge: string
    instruction: string
    detail: string
  }
  playground: {
    title: string
    badge: string
    power: string
    instruction: string
    detail: string
  }
  levels: readonly LevelExplainer[]
}

export interface ActiveExplainer {
  gameId: GameId
  gameName: string
  gameIcon: string
  badge: string
  title: string
  instruction: string
  detail: string
}

export const SUB_GAME_EXPLAINERS: Record<GameId, SubGameExplainer> = {
  smash: {
    id: 'smash',
    name: 'Smash',
    icon: '⭐',
    tagline: 'Colourful shapes, letters & friendly creatures',
    description: 'Every keypress or tap spawns bursting shapes, bouncy cosmic orbs, and visiting dinosaurs or sharks.',
    freePlay: {
      title: 'Smash · Free Play',
      badge: 'FREE PLAY',
      instruction: 'Tap or press any key to burst shapes, letters & creatures',
      detail: 'Press D for dinosaurs, S for sharks. Fast mashing climbs a musical pentatonic arpeggio!',
    },
    firefly: {
      title: 'Secret Challenge',
      badge: 'ENTRANCE',
      instruction: 'Follow and tap the glowing firefly 3 times',
      detail: 'Tap the friendly firefly three times to unlock the hidden shape puzzles.',
    },
    playground: {
      title: 'Celestial Garden',
      badge: 'CREATIVE POWER',
      power: 'Constellation Stars',
      instruction: 'Tap or press to plant up to 24 connected glowing stars',
      detail: 'Place glowing stars across the canvas that link together with shimmering constellation threads.',
    },
    levels: [
      {
        level: 1,
        tier: 1,
        tierName: 'Tier 1: Silhouette Matching',
        title: 'Match Silhouette',
        badge: 'LEVEL 1 OF 6',
        instruction: 'Look at the shape above and choose its match below',
        detail: 'Match the circle silhouette by selecting the identical shape from the three choices.',
      },
      {
        level: 2,
        tier: 1,
        tierName: 'Tier 1: Silhouette Matching',
        title: 'Match Silhouette',
        badge: 'LEVEL 2 OF 6',
        instruction: 'Find and choose the matching triangle',
        detail: 'Look closely at the triangle silhouette and tap its twin below.',
      },
      {
        level: 3,
        tier: 2,
        tierName: 'Tier 2: Alternating Pattern',
        title: 'Continue Pattern',
        badge: 'LEVEL 3 OF 6',
        instruction: 'Follow the rhythm: Circle, Triangle, Circle... what comes next?',
        detail: 'Notice the alternating rhythm and pick the next two shapes to extend the sequence.',
      },
      {
        level: 4,
        tier: 2,
        tierName: 'Tier 2: Alternating Pattern',
        title: 'Star Pattern',
        badge: 'LEVEL 4 OF 6',
        instruction: 'Complete the starry pattern: Star, Circle, Star...',
        detail: 'Follow the alternating star-and-circle sequence and complete the final two shapes.',
      },
      {
        level: 5,
        tier: 3,
        tierName: 'Tier 3: Shape Memory',
        title: 'Remember Shapes',
        badge: 'LEVEL 5 OF 6',
        instruction: 'Watch the 3 shapes appear, then tap them in order',
        detail: 'Watch Circle, Star, and Triangle light up, then repeat the sequence from memory.',
      },
      {
        level: 6,
        tier: 3,
        tierName: 'Tier 3: Shape Memory',
        title: 'Remember Shapes',
        badge: 'LEVEL 6 OF 6',
        instruction: 'Remember and repeat the full 3-shape sequence',
        detail: 'Watch Star, Triangle, and Circle, then recall and tap all three shapes in order.',
      },
    ],
  },
  piano: {
    id: 'piano',
    name: 'Piano',
    icon: '🎹',
    tagline: 'Rainbow keys & animal choir call-and-response',
    description: 'Rainbow keys tuned to a pentatonic scale. Play 3-note phrases to hear animal choirs harmonize back!',
    freePlay: {
      title: 'Piano · Free Play',
      badge: 'FREE PLAY',
      instruction: 'Tap rainbow keys or use number and letter rows',
      detail: 'Number row 1–0 and letters play keys. Play 3-note tunes to hear the animal choir harmonize!',
    },
    firefly: {
      title: 'Secret Challenge',
      badge: 'ENTRANCE',
      instruction: 'Follow the firefly along the keyboard 3 times',
      detail: 'Tap the friendly firefly three times to unlock the melody copy challenges.',
    },
    playground: {
      title: 'Choral Echo',
      badge: 'CREATIVE POWER',
      power: 'Pentatonic Harmonies',
      instruction: 'Every played note receives a gentle harmony echo',
      detail: 'Play freely — each note echoes back with a warm, quiet pentatonic choral response.',
    },
    levels: [
      {
        level: 1,
        tier: 1,
        tierName: 'Tier 1: Two-Note Melody',
        title: 'Two-Note Melody',
        badge: 'LEVEL 1 OF 6',
        instruction: 'Listen to the two notes and play them back on the keys',
        detail: 'Hear the gentle two-note call and replay both rainbow notes in order.',
      },
      {
        level: 2,
        tier: 1,
        tierName: 'Tier 1: Two-Note Melody',
        title: 'Two-Note Step',
        badge: 'LEVEL 2 OF 6',
        instruction: 'Follow the ascending step and copy the two notes',
        detail: 'Listen to the rising melodic step and play both keys in order.',
      },
      {
        level: 3,
        tier: 2,
        tierName: 'Tier 2: Three-Note Melody',
        title: 'Three-Note Melody',
        badge: 'LEVEL 3 OF 6',
        instruction: 'Listen to the three-note tune and play each note in order',
        detail: 'Follow the three-note melodic melody and copy the three rainbow notes.',
      },
      {
        level: 4,
        tier: 2,
        tierName: 'Tier 2: Three-Note Melody',
        title: 'Melodic Leap',
        badge: 'LEVEL 4 OF 6',
        instruction: 'Copy the melody leap across the keyboard',
        detail: 'Listen to the high-to-low melodic jump and play all three keys.',
      },
      {
        level: 5,
        tier: 3,
        tierName: 'Tier 3: Four-Note Phrase',
        title: 'Four-Note Phrase',
        badge: 'LEVEL 5 OF 6',
        instruction: 'Listen closely and replay the four-note song',
        detail: 'Hear the full four-note phrase and replay every note on the rainbow keys.',
      },
      {
        level: 6,
        tier: 3,
        tierName: 'Tier 3: Four-Note Phrase',
        title: 'Four-Note Harmony',
        badge: 'LEVEL 6 OF 6',
        instruction: 'Replay the concluding four-note phrase',
        detail: 'Master the final four-note phrase to unlock the choral echo creative power.',
      },
    ],
  },
  drawing: {
    id: 'drawing',
    name: 'Drawing',
    icon: '🎨',
    tagline: 'Singing rainbow ribbons & mystery scratch cards',
    description: 'Drag fingers to paint humming rainbow strokes, stamp stickers, and scratch mystery cards for badges.',
    freePlay: {
      title: 'Drawing · Free Play',
      badge: 'FREE PLAY',
      instruction: 'Drag to paint rainbow trails & scratch cards for badges',
      detail: 'Strokes hum higher as you draw higher. Keys stamp stickers. Old ink gently fades after 30 seconds.',
    },
    firefly: {
      title: 'Secret Challenge',
      badge: 'ENTRANCE',
      instruction: 'Follow the glowing firefly 3 times across the canvas',
      detail: 'Find and tap the firefly three times to unlock the dot-connecting route puzzles.',
    },
    playground: {
      title: 'Kaleidoscope Mirror',
      badge: 'CREATIVE POWER',
      power: 'Bilateral Symmetry',
      instruction: 'Rainbow strokes and stickers mirror across the canvas',
      detail: 'Paint with magical symmetry — every stroke and sticker reflects across the center line.',
    },
    levels: [
      {
        level: 1,
        tier: 1,
        tierName: 'Tier 1: Straight Path',
        title: 'Straight Path',
        badge: 'LEVEL 1 OF 6',
        instruction: 'Draw a line connecting the 3 dots across horizontally',
        detail: 'Connect the dots from left to right in one smooth horizontal stroke.',
      },
      {
        level: 2,
        tier: 1,
        tierName: 'Tier 1: Straight Path',
        title: 'Straight Path',
        badge: 'LEVEL 2 OF 6',
        instruction: 'Draw straight down to connect the vertical dots',
        detail: 'Trace the vertical line of dots straight down from top to bottom.',
      },
      {
        level: 3,
        tier: 2,
        tierName: 'Tier 2: Bent Path',
        title: 'Bent Path',
        badge: 'LEVEL 3 OF 6',
        instruction: 'Draw through the dots and turn the corner',
        detail: 'Connect four dots around the corner in one continuous path.',
      },
      {
        level: 4,
        tier: 2,
        tierName: 'Tier 2: Bent Path',
        title: 'Winding Path',
        badge: 'LEVEL 4 OF 6',
        instruction: 'Trace the zigzag route through each dot',
        detail: 'Follow the winding path through all four waypoints from start to finish.',
      },
      {
        level: 5,
        tier: 3,
        tierName: 'Tier 3: Closed Shape',
        title: 'Closed Shape',
        badge: 'LEVEL 5 OF 6',
        instruction: 'Trace along the outer border and close the full loop',
        detail: 'Trace all the way around the outer dots, returning to the start to seal the loop.',
      },
      {
        level: 6,
        tier: 3,
        tierName: 'Tier 3: Closed Shape',
        title: 'Complete Loop',
        badge: 'LEVEL 6 OF 6',
        instruction: 'Trace the perimeter in reverse to complete the circuit',
        detail: 'Follow the outer circuit in reverse and connect back to the starting dot.',
      },
    ],
  },
}

export function getSubGameExplainer(game: GameId): SubGameExplainer {
  return SUB_GAME_EXPLAINERS[game]
}

export function getLevelExplainer(game: GameId, solved: number): LevelExplainer {
  const list = SUB_GAME_EXPLAINERS[game].levels
  const index = Math.min(list.length - 1, Math.max(0, Math.trunc(solved) || 0))
  return list[index]
}

export function getCurrentExplainer(
  game: GameId,
  view: 'free' | 'puzzle' | 'playground',
  solved = 0,
  entranceStep = 0,
): ActiveExplainer {
  const g = SUB_GAME_EXPLAINERS[game]
  if (view === 'playground' || solved >= 6) {
    return {
      gameId: game,
      gameName: g.name,
      gameIcon: g.icon,
      badge: g.playground.badge,
      title: `${g.name} · ${g.playground.title}`,
      instruction: g.playground.instruction,
      detail: g.playground.detail,
    }
  }

  if (view === 'puzzle') {
    const lvl = getLevelExplainer(game, solved)
    return {
      gameId: game,
      gameName: g.name,
      gameIcon: g.icon,
      badge: lvl.badge,
      title: `${lvl.title}`,
      instruction: lvl.instruction,
      detail: lvl.detail,
    }
  }

  // view === 'free'
  if (entranceStep > 0) {
    return {
      gameId: game,
      gameName: g.name,
      gameIcon: g.icon,
      badge: g.firefly.badge,
      title: g.firefly.title,
      instruction: g.firefly.instruction,
      detail: g.firefly.detail,
    }
  }

  return {
    gameId: game,
    gameName: g.name,
    gameIcon: g.icon,
    badge: g.freePlay.badge,
    title: g.freePlay.title,
    instruction: g.freePlay.instruction,
    detail: g.freePlay.detail,
  }
}
