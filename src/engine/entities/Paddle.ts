import type { Rect } from '../physics/collision';
import { clamp } from '../physics/vector';

export class Paddle implements Rect {
  /** Left edge. */
  x: number;
  private currentWidth: number;

  constructor(
    width: number,
    readonly height: number,
    readonly y: number,
    private readonly fieldWidth: number,
  ) {
    this.currentWidth = width;
    this.x = (fieldWidth - width) / 2;
  }

  get width(): number {
    return this.currentWidth;
  }

  /** Changes the width around the current center, staying inside the field. */
  resize(width: number): void {
    const center = this.centerX;
    this.currentWidth = width;
    this.moveTo(center);
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
