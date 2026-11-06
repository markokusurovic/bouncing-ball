import type { HighScoreRepository } from '../engine/core/interfaces';
import type { HighScore } from '../engine/scoring/highScores';

const KEY = 'bouncing-ball.highScores';

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isHighScore(value: unknown): value is HighScore {
  if (typeof value !== 'object' || value === null) return false;
  const { initials, score, level } = value as Record<string, unknown>;
  return (
    typeof initials === 'string' &&
    /^[A-Z]{1,3}$/.test(initials) &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    typeof level === 'number' &&
    Number.isFinite(level)
  );
}

/**
 * Keeps the high-score table in localStorage as JSON. Broken or tampered data
 * is ignored rather than crashing the game, and storage errors (private mode,
 * full quota) only mean the scores aren't kept.
 */
export class LocalStorageHighScoreRepository implements HighScoreRepository {
  constructor(private readonly storage: ScoreStorage | null) {}

  load(): HighScore[] {
    try {
      const raw = this.storage?.getItem(KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(isHighScore)
        .map(({ initials, score, level }) => ({ initials, score, level }));
    } catch {
      return [];
    }
  }

  save(entries: readonly HighScore[]): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(entries));
    } catch {
      // Nothing to do: the table just isn't persisted.
    }
  }
}
