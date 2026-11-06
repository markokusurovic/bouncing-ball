import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../../src/engine/core/Rng';

describe('createSeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    for (let i = 0; i < 5; i++) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    expect(createSeededRng(1).next()).not.toBe(createSeededRng(2).next());
  });

  it('stays within [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
