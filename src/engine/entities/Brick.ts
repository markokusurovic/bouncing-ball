import type { Rect } from '../physics/collision';
import type { PaletteKey } from '../../theme/palette';
import type { SpriteId } from '../core/interfaces';

const NORMAL_SPRITES: Partial<Record<PaletteKey, SpriteId>> = {
  brick1: 'brick1',
  brick2: 'brick2',
  brick3: 'brick3',
  brick4: 'brick4',
};

export type BrickKind = 'normal' | 'silver' | 'metal';

export class Brick implements Rect {
  /** Hits still needed to destroy the brick; Infinity for metal. */
  hitsLeft: number;
  readonly maxHits: number;

  constructor(
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number,
    readonly kind: BrickKind,
    hits: number,
    readonly points: number,
    readonly color: PaletteKey,
  ) {
    this.hitsLeft = hits;
    this.maxHits = hits;
  }

  /** Silver bricks look cracked once they have been hit. */
  get sprite(): SpriteId {
    if (this.kind === 'metal') return 'brickMetal';
    if (this.kind === 'silver') {
      return this.hitsLeft < this.maxHits
        ? 'brickSilverCracked'
        : 'brickSilver';
    }
    return NORMAL_SPRITES[this.color] ?? 'brick1';
  }

  get breakable(): boolean {
    return this.kind !== 'metal';
  }

  get destroyed(): boolean {
    return this.hitsLeft <= 0;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  /** Takes one hit. Returns true if this hit destroyed the brick. */
  hit(): boolean {
    if (!this.breakable || this.destroyed) return false;
    this.hitsLeft--;
    return this.destroyed;
  }
}
