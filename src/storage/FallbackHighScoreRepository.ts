import type { HighScoreRepository } from '../engine/core/interfaces';
import type { HighScore } from '../engine/scoring/highScores';

/**
 * Uses the primary (online) repository and falls back to the local one when it
 * can't be reached. New entries always go to the local table too, so a score
 * made offline is still kept on this device.
 */
export class FallbackHighScoreRepository implements HighScoreRepository {
  constructor(
    private readonly primary: HighScoreRepository,
    private readonly fallback: HighScoreRepository,
  ) {}

  async load(): Promise<HighScore[]> {
    try {
      return await this.primary.load();
    } catch {
      return this.fallback.load();
    }
  }

  async add(entry: HighScore): Promise<void> {
    await this.fallback.add(entry);
    try {
      await this.primary.add(entry);
    } catch {
      // Kept locally only.
    }
  }
}
