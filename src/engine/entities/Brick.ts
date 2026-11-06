import type { Rect } from '../physics/collision';
import type { PaletteKey } from '../../theme/palette';

export type BrickKind = 'normal' | 'silver' | 'metal';

export class Brick implements Rect {
  /** Hits still needed to destroy the brick; Infinity for metal. */
  hitsLeft: number;

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
