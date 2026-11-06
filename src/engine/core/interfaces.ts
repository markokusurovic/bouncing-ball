import type { PaletteKey } from '../../theme/palette';
import type { Command } from '../input/commands';

/** Draws to the 320×240 view. Colors are palette keys, never raw values. */
export interface Renderer {
  clear(color: PaletteKey): void;
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: PaletteKey,
  ): void;
}

export interface InputSource {
  /** Commands collected since the previous poll. */
  poll(): readonly Command[];
}

export interface Rng {
  /** Uniform random number in [0, 1). */
  next(): number;
}
