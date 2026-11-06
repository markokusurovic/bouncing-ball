import type { Rect } from '../physics/collision';
import { clamp } from '../physics/vector';

export class Paddle implements Rect {
  /** Left edge. */
  x: number;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly y: number,
    private readonly fieldWidth: number,
  ) {
    this.x = (fieldWidth - width) / 2;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  moveBy(dx: number): void {
    this.x = clamp(this.x + dx, 0, this.fieldWidth - this.width);
  }

  moveTo(centerX: number): void {
    this.x = clamp(centerX - this.width / 2, 0, this.fieldWidth - this.width);
  }
}
