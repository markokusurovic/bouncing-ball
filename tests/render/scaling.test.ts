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

  it('never goes below 1, even for tiny or negative space', () => {
    expect(computeScale(100, 100, 320, 240)).toBe(1);
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
