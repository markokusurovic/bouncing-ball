import type { Renderer } from '../engine/core/interfaces';
import { palette, type PaletteKey } from '../theme/palette';

/** The parts of a 2D canvas context the renderer uses (easy to fake in tests). */
export type DrawingContext = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'fillRect' | 'imageSmoothingEnabled'
>;

export class CanvasRenderer implements Renderer {
  constructor(
    private readonly ctx: DrawingContext,
    private readonly width: number,
    private readonly height: number,
  ) {
    ctx.imageSmoothingEnabled = false;
  }

  clear(color: PaletteKey): void {
    this.ctx.fillStyle = palette[color];
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Coordinates are rounded to whole pixels to keep pixel art crisp. */
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: PaletteKey,
  ): void {
    this.ctx.fillStyle = palette[color];
    this.ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.round(width),
      Math.round(height),
    );
  }
}
