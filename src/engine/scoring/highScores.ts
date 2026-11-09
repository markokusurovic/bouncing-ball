export interface HighScore {
  readonly initials: string;
  readonly score: number;
  /** Level reached when the game ended. */
  readonly level: number;
}

/** Type guard for entries read from storage or the network. */
export function isHighScore(value: unknown): value is HighScore {
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

/** Keeps only valid entries, stripped to the known fields. */
export function parseHighScores(value: unknown): HighScore[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isHighScore)
    .map(({ initials, score, level }) => ({ initials, score, level }));
}

/** True if `score` would make it into a table of at most `max` entries. */
export function qualifies(
  entries: readonly HighScore[],
  score: number,
  max: number,
): boolean {
  if (score <= 0) return false;
  if (entries.length < max) return true;
  const lowest = entries.at(-1);
  return lowest !== undefined && score > lowest.score;
}

/**
 * Adds an entry and returns the new table, best first, at most `max` long.
 * A new score goes below older equal scores (first come, first ranked).
 */
export function insertScore(
  entries: readonly HighScore[],
  entry: HighScore,
  max: number,
): HighScore[] {
  const index = entries.findIndex((existing) => entry.score > existing.score);
  const table = [...entries];
  table.splice(index === -1 ? table.length : index, 0, entry);
  return table.slice(0, max);
}
