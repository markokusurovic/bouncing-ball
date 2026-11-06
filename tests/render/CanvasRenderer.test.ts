import { describe, expect, it } from 'vitest';
import {
  CanvasRenderer,
  type DrawingContext,
} from '../../src/render/CanvasRenderer';
import { palette } from '../../src/theme/palette';

/** Records each rectangle together with the fill style active at that moment. */
function fakeContext(): DrawingContext & { rects: unknown[][] } {
  return {
    imageSmoothingEnabled: true,
    fillStyle: '',
    rects: [],
    fillRect(x: number, y: number, w: number, h: number): void {
      this.rects.push([this.fillStyle, x, y, w, h]);
    },
  };
}

describe('CanvasRenderer', () => {
  it('turns off image smoothing', () => {
    const ctx = fakeContext();
    const renderer = new CanvasRenderer(ctx, 320, 240);
    expect(renderer).toBeDefined();
    expect(ctx.imageSmoothingEnabled).toBe(false);
  });

  it('clears the whole view with a palette color', () => {
    const ctx = fakeContext();
    new CanvasRenderer(ctx, 320, 240).clear('playfield');
    expect(ctx.rects).toEqual([[palette.playfield, 0, 0, 320, 240]]);
  });

  it('draws rectangles on whole pixels', () => {
    const ctx = fakeContext();
    new CanvasRenderer(ctx, 320, 240).fillRect(1.4, 2.6, 5.5, 3.2, 'ball');
    expect(ctx.rects).toEqual([[palette.ball, 1, 3, 6, 3]]);
  });
});
