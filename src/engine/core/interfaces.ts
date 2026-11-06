import type { PaletteKey } from '../../theme/palette';
import type { SoundId } from '../audio/sounds';
import type { Command } from '../input/commands';

/** Every sprite the engine can ask for; the pixel maps live in `render/sprites/`. */
export type SpriteId =
  | 'brick1'
  | 'brick2'
  | 'brick3'
  | 'brick4'
  | 'brickSilver'
  | 'brickSilverCracked'
  | 'brickMetal'
  | 'paddle'
  | 'paddleWide'
  | 'paddleLaser'
  | 'paddleWideLaser'
  | 'ball'
  | 'capsuleWide'
  | 'capsuleMulti'
  | 'capsuleSlow'
  | 'capsuleLaser'
  | 'bullet';

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
  /** Draws a sprite with its top-left corner at (x, y). */
  drawSprite(id: SpriteId, x: number, y: number): void;
}

/** Plays sound. Implemented outside the engine with the Web Audio API. */
export interface AudioPlayer {
  play(sound: SoundId): void;
  startMusic(): void;
  stopMusic(): void;
  toggleMute(): void;
}

export interface InputSource {
  /** Commands collected since the previous poll. */
  poll(): readonly Command[];
}

export interface Rng {
  /** Uniform random number in [0, 1). */
  next(): number;
}
