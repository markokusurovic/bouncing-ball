import { describe, expect, it } from 'vitest';
import {
  insertScore,
  qualifies,
  type HighScore,
} from '../../../src/engine/scoring/highScores';

const entry = (initials: string, score: number): HighScore => ({
  initials,
  score,
  level: 1,
});

describe('high scores', () => {
  it('qualifies any positive score while the table has room', () => {
    expect(qualifies([], 10, 3)).toBe(true);
    expect(qualifies([], 0, 3)).toBe(false);
  });

  it('needs to beat the lowest score of a full table', () => {
    const full = [entry('A', 30), entry('B', 20), entry('C', 10)];
    expect(qualifies(full, 10, 3)).toBe(false);
    expect(qualifies(full, 11, 3)).toBe(true);
    expect(qualifies([], 5, 0)).toBe(false);
  });

  it('inserts in order below equal scores and trims to the maximum', () => {
    const table = [entry('A', 30), entry('B', 20), entry('C', 10)];
    expect(
      insertScore(table, entry('N', 20), 3).map((e) => e.initials),
    ).toEqual(['A', 'B', 'N']);
    expect(insertScore(table, entry('N', 99), 3)[0]?.initials).toBe('N');
    expect(insertScore(table, entry('N', 5), 4).at(-1)?.initials).toBe('N');
    expect(table).toHaveLength(3);
  });
});
