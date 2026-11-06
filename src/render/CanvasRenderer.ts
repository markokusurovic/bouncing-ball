import { gameConfig } from '../engine/config/gameConfig';
import type { Renderer, SpriteId } from '../engine/core/interfaces';
import { palette, type PaletteKey } from '../theme/palette';
import { compileSprite, type PixelRun, type Sprite } from './sprites/Sprite';
import { createSprites } from './sprites/sprites';

/** The parts of a 2D canvas context the renderer uses (easy to fake in tests). */
export type DrawingContext = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'fillRect' | 'imageSmoothingEnabled'
>;

export class CanvasRenderer implements Renderer {
  private readonly sprites = new Map<SpriteId, PixelRun[]>();

  constructor(
    private readonly ctx: DrawingContext,
    private readonly width: number,
    private readonly height: number,
    sprites: Readonly<Record<SpriteId, Sprite>> = createSprites(gameConfig),
  ) {
    ctx.imageSmoothingEnabled = false;
    for (const [id, sprite] of Object.entries(sprites)) {
      this.sprites.set(id as SpriteId, compileSprite(sprite));
    }
  }

  drawSprite(id: SpriteId, x: number, y: number): void {
    const left = Math.round(x);
    const top = Math.round(y);
    for (const run of this.sprites.get(id) ?? []) {
      this.ctx.fillStyle = palette[run.color];
      this.ctx.fillRect(left + run.x, top + run.y, run.width, 1);
    }
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
