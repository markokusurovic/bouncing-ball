import type { Waveform } from './sounds';

export interface Note {
  /** Frequency in Hz, or null for a rest. */
  readonly frequency: number | null;
  /** Length in beats (quarter notes). */
  readonly beats: number;
}

export interface Track {
  readonly wave: Waveform;
  readonly volume: number;
  readonly notes: readonly Note[];
}

const SEMITONES: Readonly<Record<string, number>> = {
  C: -9,
  D: -7,
  E: -5,
  F: -4,
  G: -2,
  A: 0,
  B: 2,
};

/** Frequency of a note name like `A4` (440 Hz), `C#5` or `Bb3`. */
export function noteFrequency(name: string): number {
  const match = /^([A-G])([#b]?)(\d)$/.exec(name);
  const base = match ? SEMITONES[match[1] ?? ''] : undefined;
  if (!match || base === undefined) throw new Error(`Bad note "${name}"`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  const octave = Number(match[3]) - 4;
  return 440 * 2 ** ((base + accidental + octave * 12) / 12);
}

/** Parses `"A4:0.5 C5:1 -:2"` (note:beats, `-` is a rest). */
export function parseNotes(text: string): Note[] {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [name = '', beats = ''] = token.split(':');
      const length = Number(beats);
      if (!(length > 0)) throw new Error(`Bad note length in "${token}"`);
      return {
        frequency: name === '-' ? null : noteFrequency(name),
        beats: length,
      };
    });
}

export function totalBeats(notes: readonly Note[]): number {
  return notes.reduce((sum, note) => sum + note.beats, 0);
}

/** A scheduled note, times in seconds from the start of the music. */
export interface ScheduledNote {
  readonly frequency: number | null;
  readonly start: number;
  readonly duration: number;
}

/** Steps through a track forever, looping at the end. */
export class Sequencer {
  private index = 0;
  private time = 0;

  constructor(
    private readonly notes: readonly Note[],
    private readonly bpm: number,
  ) {
    if (notes.length === 0) throw new Error('Empty track');
  }

  /** Start time of the next note. */
  get nextStart(): number {
    return this.time;
  }

  next(): ScheduledNote {
    const note = this.notes[this.index] as Note;
    const duration = (note.beats * 60) / this.bpm;
    const scheduled = { frequency: note.frequency, start: this.time, duration };
    this.time += duration;
    this.index = (this.index + 1) % this.notes.length;
    return scheduled;
  }
}

export const MUSIC_BPM = 140;

/** The looping in-game tune: an eight-bar lead over a bouncing bass. */
export const MUSIC: readonly Track[] = [
  {
    wave: 'square',
    volume: 0.6,
    notes: parseNotes(`
      A4:0.5 C5:0.5 E5:0.5 A5:0.5 G5:0.5 E5:0.5 C5:0.5 E5:0.5
      F5:1 E5:0.5 D5:0.5 C5:1 -:1
      G4:0.5 B4:0.5 D5:0.5 G5:0.5 F5:0.5 D5:0.5 B4:0.5 D5:0.5
      E5:1 D5:0.5 C5:0.5 B4:1 -:1
      A4:0.5 C5:0.5 E5:0.5 A5:0.5 B5:0.5 A5:0.5 G5:0.5 E5:0.5
      F5:0.5 A5:0.5 G5:0.5 F5:0.5 E5:1 C5:1
      D5:0.5 E5:0.5 F5:0.5 D5:0.5 E5:0.5 C5:0.5 B4:0.5 G4:0.5
      A4:2 -:2
    `),
  },
  {
    wave: 'triangle',
    volume: 1,
    notes: parseNotes(`
      A2:1 A3:1 A2:1 A3:1  F2:1 F3:1 F2:1 F3:1
      G2:1 G3:1 G2:1 G3:1  E2:1 E3:1 E2:1 E3:1
      A2:1 A3:1 A2:1 A3:1  F2:1 F3:1 C3:1 C3:1
      D3:1 D3:1 E3:1 E3:1  A2:1 E3:1 A2:2
    `),
  },
];
