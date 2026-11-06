import type { Poolable } from '../core/Pool';
import type { Rect } from '../physics/collision';
import type { PowerUpType } from '../powerups/PowerUp';

/** A falling capsule that grants a power-up when the paddle catches it. */
export class PowerUpCapsule implements Rect, Poolable {
  active = false;
  x = 0;
  y = 0;
  type: PowerUpType = 'wide';

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  /** Drops a capsule centered on a point. */
  drop(type: PowerUpType, centerX: number, centerY: number): void {
    this.type = type;
    this.x = centerX - this.width / 2;
    this.y = centerY - this.height / 2;
  }
}
