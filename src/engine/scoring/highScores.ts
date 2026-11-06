export interface HighScore {
  readonly initials: string;
  readonly score: number;
  /** Level reached when the game ended. */
  readonly level: number;
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
