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
  it('saves and loads entries as JSON', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageHighScoreRepository(storage);
    expect(repository.load()).toEqual([]);
    repository.save([{ initials: 'ABC', score: 120, level: 3 }]);
    expect(repository.load()).toEqual([
      { initials: 'ABC', score: 120, level: 3 },
    ]);
  });

  it('ignores broken or tampered data', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageHighScoreRepository(storage);
    storage.setItem(KEY, '{not json');
    expect(repository.load()).toEqual([]);
    storage.setItem(KEY, '{"a":1}');
    expect(repository.load()).toEqual([]);
    storage.setItem(
      KEY,
      JSON.stringify([
        { initials: 'OK', score: 5, level: 1, extra: true },
        { initials: '<script>', score: 5, level: 1 },
        { initials: 'NAN', score: 'lots', level: 1 },
        null,
      ]),
    );
    expect(repository.load()).toEqual([{ initials: 'OK', score: 5, level: 1 }]);
  });

  it('survives unavailable or failing storage', () => {
    expect(new LocalStorageHighScoreRepository(null).load()).toEqual([]);
    const failing = {
      getItem: (): string => {
        throw new Error('blocked');
      },
      setItem: (): void => {
        throw new Error('full');
      },
    };
    const repository = new LocalStorageHighScoreRepository(failing);
    expect(repository.load()).toEqual([]);
    expect(() => repository.save([])).not.toThrow();
  });
});
