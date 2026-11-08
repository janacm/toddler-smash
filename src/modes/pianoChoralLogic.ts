export type AnimalFaceKind = 'frog' | 'kitten' | 'bird' | 'puppy'

export const PIANO_ANIMALS: readonly AnimalFaceKind[] = ['frog', 'kitten', 'bird', 'puppy'] as const

/** Maps any piano key index (0..n) cyclically to one of the 4 animal faces. */
export function getAnimalForPianoKey(keyIndex: number): AnimalFaceKind {
  const n = PIANO_ANIMALS.length
  return PIANO_ANIMALS[((keyIndex % n) + n) % n]
}

/** Pentatonic harmony interval (+2 scale degrees = pentatonic third). */
export function calculatePentatonicHarmony(noteIndex: number, interval = 2): number {
  return noteIndex + interval
}

export interface ChoralPhrase {
  notes: [number, number, number]
  harmonies: [number, number, number]
  animals: [AnimalFaceKind, AnimalFaceKind, AnimalFaceKind]
}

export interface PhraseDetectorOptions {
  maxGapMs?: number
  phraseMaxGapMs?: number
  phraseLength?: number
  phraseLen?: number
  harmonyInterval?: number
}

/**
 * Detects 3-note melodic phrases within a sliding time window.
 * Ignores system echo notes. Resets on time-out or clear.
 */
export class ChoralPhraseDetector {
  private buffer: Array<{ note: number; time: number }> = []
  private readonly maxGapMs: number
  private readonly phraseLength: number
  private readonly harmonyInterval: number

  constructor(options?: PhraseDetectorOptions) {
    this.maxGapMs = options?.maxGapMs ?? options?.phraseMaxGapMs ?? 1200
    this.phraseLength = options?.phraseLength ?? options?.phraseLen ?? 3
    this.harmonyInterval = options?.harmonyInterval ?? 2
  }

  recordNote(noteIndex: number, timeMs: number, isEcho = false): ChoralPhrase | null {
    if (isEcho) return null

    if (this.buffer.length > 0) {
      const lastTime = this.buffer[this.buffer.length - 1].time
      if (timeMs - lastTime > this.maxGapMs) {
        this.buffer = []
      }
    }

    this.buffer.push({ note: noteIndex, time: timeMs })

    if (this.buffer.length >= this.phraseLength) {
      const slice = this.buffer.slice(-this.phraseLength)
      const notes: [number, number, number] = [slice[0].note, slice[1].note, slice[2].note]
      const harmonies: [number, number, number] = [
        calculatePentatonicHarmony(notes[0], this.harmonyInterval),
        calculatePentatonicHarmony(notes[1], this.harmonyInterval),
        calculatePentatonicHarmony(notes[2], this.harmonyInterval),
      ]
      const animals: [AnimalFaceKind, AnimalFaceKind, AnimalFaceKind] = [
        getAnimalForPianoKey(notes[0]),
        getAnimalForPianoKey(notes[1]),
        getAnimalForPianoKey(notes[2]),
      ]
      this.buffer = [] // Reset buffer after firing to prevent immediate re-triggering
      return { notes, harmonies, animals }
    }

    return null
  }

  reset(): void {
    this.buffer = []
  }
}
