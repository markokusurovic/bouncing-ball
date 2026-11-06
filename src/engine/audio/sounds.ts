export type Waveform = 'square' | 'triangle' | 'sawtooth' | 'sine';

/**
 * A synthesized sound effect: notes played one after another, each `step`
 * seconds long. With `slide`, the pitch glides from note to note instead.
 */
export interface SoundSpec {
  readonly wave: Waveform;
  /** Frequencies in Hz. */
  readonly notes: readonly number[];
  readonly step: number;
  readonly slide?: boolean;
  /** Loudness 0–1 relative to other effects. */
  readonly volume: number;
}

export type SoundId =
  | 'launch'
  | 'paddle'
  | 'brick'
  | 'metal'
  | 'laser'
  | 'powerUp'
  | 'extraLife'
  | 'lose'
  | 'levelClear'
  | 'gameOver';

export const SOUNDS: Readonly<Record<SoundId, SoundSpec>> = {
  launch: {
    wave: 'square',
    notes: [440, 880],
    step: 0.06,
    slide: true,
    volume: 0.6,
  },
  paddle: { wave: 'square', notes: [330], step: 0.05, volume: 0.6 },
  brick: { wave: 'square', notes: [660, 990], step: 0.04, volume: 0.5 },
  metal: { wave: 'triangle', notes: [1400], step: 0.06, volume: 0.8 },
  laser: {
    wave: 'sawtooth',
    notes: [1200, 300],
    step: 0.1,
    slide: true,
    volume: 0.4,
  },
  powerUp: {
    wave: 'square',
    notes: [523, 659, 784, 1047],
    step: 0.05,
    volume: 0.5,
  },
  extraLife: {
    wave: 'square',
    notes: [784, 988, 1175, 1568],
    step: 0.08,
    volume: 0.6,
  },
  lose: {
    wave: 'triangle',
    notes: [440, 110],
    step: 0.45,
    slide: true,
    volume: 1,
  },
  levelClear: {
    wave: 'square',
    notes: [523, 659, 784, 1047, 784, 1047],
    step: 0.09,
    volume: 0.5,
  },
  gameOver: {
    wave: 'triangle',
    notes: [392, 330, 262, 196],
    step: 0.2,
    volume: 1,
  },
};
