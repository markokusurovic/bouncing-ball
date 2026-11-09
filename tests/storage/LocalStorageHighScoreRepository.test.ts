import { describe, expect, it } from 'vitest';
import { LocalStorageHighScoreRepository } from '../../src/storage/LocalStorageHighScoreRepository';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const KEY = 'bouncing-ball.highScores';

describe('LocalStorageHighScoreRepository', () => {
  it('adds entries in order, keeps at most the max and loads them', async () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageHighScoreRepository(storage, 2);
    expect(await repository.load()).toEqual([]);
    await repository.add({ initials: 'ABC', score: 120, level: 3 });
    await repository.add({ initials: 'TOP', score: 500, level: 5 });
    await repository.add({ initials: 'LOW', score: 10, level: 1 });
    expect(await repository.load()).toEqual([
      { initials: 'TOP', score: 500, level: 5 },
      { initials: 'ABC', score: 120, level: 3 },
    ]);
  });

  it('ignores broken or tampered data', async () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageHighScoreRepository(storage, 10);
    storage.setItem(KEY, '{not json');
    expect(await repository.load()).toEqual([]);
    storage.setItem(KEY, '{"a":1}');
    expect(await repository.load()).toEqual([]);
    storage.setItem(
      KEY,
      JSON.stringify([
        { initials: 'OK', score: 5, level: 1, extra: true },
        { initials: '<script>', score: 5, level: 1 },
        { initials: 'NAN', score: 'lots', level: 1 },
        null,
      ]),
    );
    expect(await repository.load()).toEqual([
      { initials: 'OK', score: 5, level: 1 },
    ]);
  });

  it('survives unavailable or failing storage', async () => {
    expect(await new LocalStorageHighScoreRepository(null, 10).load()).toEqual(
      [],
    );
    const failing = {
      getItem: (): string => {
        throw new Error('blocked');
      },
      setItem: (): void => {
        throw new Error('full');
      },
    };
    const repository = new LocalStorageHighScoreRepository(failing, 10);
    expect(await repository.load()).toEqual([]);
    await expect(
      repository.add({ initials: 'A', score: 1, level: 1 }),
    ).resolves.toBeUndefined();
  });
});
