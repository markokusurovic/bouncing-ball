import type { HighScoreRepository } from '../engine/core/interfaces';
import {
  insertScore,
  parseHighScores,
  type HighScore,
} from '../engine/scoring/highScores';

const KEY = 'bouncing-ball.highScores';

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Keeps the high-score table in localStorage as JSON. Broken or tampered data
 * is ignored rather than crashing the game, and storage errors (private mode,
 * full quota) only mean the scores aren't kept.
 */
export class LocalStorageHighScoreRepository implements HighScoreRepository {
  constructor(
    private readonly storage: ScoreStorage | null,
    private readonly maxEntries: number,
  ) {}

  load(): Promise<HighScore[]> {
    return Promise.resolve(this.read());
  }

  add(entry: HighScore): Promise<void> {
    const sorted = this.read().sort((a, b) => b.score - a.score);
    try {
      this.storage?.setItem(
        KEY,
        JSON.stringify(insertScore(sorted, entry, this.maxEntries)),
      );
    } catch {
      // Nothing to do: the table just isn't persisted.
    }
    return Promise.resolve();
  }

  private read(): HighScore[] {
    try {
      const raw = this.storage?.getItem(KEY);
      return raw ? parseHighScores(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }
}
