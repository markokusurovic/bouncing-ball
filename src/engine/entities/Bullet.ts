import type { Poolable } from '../core/Pool';
import type { Rect } from '../physics/collision';

/** A laser shot. Lives in a pool; `active` says whether it is flying. */
export class Bullet implements Rect, Poolable {
  active = false;
  x = 0;
  y = 0;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  /** Fires from a point, given as the bullet's bottom center. */
  fire(centerX: number, bottom: number): void {
    this.x = centerX - this.width / 2;
    this.y = bottom - this.height;
  }
}
