import { describe, expect, it } from 'vitest';
import { computeScale } from '../../src/render/scaling';
import { gameConfig } from '../../src/engine/config/gameConfig';

describe('computeScale', () => {
  it('returns the exact factor when the space fits perfectly', () => {
    expect(computeScale(960, 720, 320, 240)).toBe(3);
  });

  it('rounds down to keep integer scaling', () => {
    expect(computeScale(1000, 800, 320, 240)).toBe(3);
  });

  it('is limited by the tighter dimension', () => {
    expect(computeScale(1920, 500, 320, 240)).toBe(2);
  });

  it('uses a fractional scale when the integer one would waste too much space', () => {
    // A phone in landscape: integer scale 1 fills only 1 / 1.4 of the height.
    expect(computeScale(800, 336, 320, 240)).toBeCloseTo(1.4);
    // Smaller than the view itself: shrink instead of overflowing.
    expect(computeScale(160, 120, 320, 240)).toBeCloseTo(0.5);
  });

  it('respects a custom minimum fill', () => {
    expect(computeScale(800, 336, 320, 240, 0.5)).toBe(1);
  });

  it('falls back to 1 for empty or negative space', () => {
    expect(computeScale(0, 0, 320, 240)).toBe(1);
    expect(computeScale(-50, -50, 320, 240)).toBe(1);
  });

  it('falls back to 1 for a zero-sized view', () => {
    expect(computeScale(800, 600, 0, 0)).toBe(1);
  });
});

describe('computeScale with the game view', () => {
  it('scales the 320×240 internal view to common screen sizes', () => {
    const { width, height } = gameConfig.view;
    expect(computeScale(1920, 1080, width, height)).toBe(4);
    expect(computeScale(1280, 720, width, height)).toBe(3);
  });
});
