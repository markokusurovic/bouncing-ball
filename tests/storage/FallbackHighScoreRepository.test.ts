import { describe, expect, it } from 'vitest';
import { FallbackHighScoreRepository } from '../../src/storage/FallbackHighScoreRepository';
import { FakeHighScores } from '../fakes';

const online = { initials: 'ON', score: 300, level: 3 };
const local = { initials: 'LOC', score: 100, level: 1 };
const entry = { initials: 'NEW', score: 200, level: 2 };

describe('FallbackHighScoreRepository', () => {
  it('loads from the primary while it is reachable', async () => {
    const repository = new FallbackHighScoreRepository(
      new FakeHighScores([online]),
      new FakeHighScores([local]),
    );
    expect(await repository.load()).toEqual([online]);
  });

  it('falls back to the local table when the primary fails', async () => {
    const primary = new FakeHighScores([online]);
    primary.failing = true;
    const repository = new FallbackHighScoreRepository(
      primary,
      new FakeHighScores([local]),
    );
    expect(await repository.load()).toEqual([local]);
  });

  it('adds new entries to both, and keeps them locally when offline', async () => {
    const primary = new FakeHighScores();
    const fallback = new FakeHighScores();
    const repository = new FallbackHighScoreRepository(primary, fallback);
    await repository.add(entry);
    primary.failing = true;
    await repository.add(local);
    expect(primary.added).toEqual([entry]);
    expect(fallback.added).toEqual([entry, local]);
  });
});
