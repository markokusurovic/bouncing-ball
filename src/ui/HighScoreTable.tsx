import type { ReactElement } from 'react';
import type { HighScore } from '../engine/scoring/highScores';
import { palette } from '../theme/palette';

interface HighScoreTableProps {
  readonly entries: readonly HighScore[];
  /** The table is being fetched; shown only while there is nothing to show. */
  readonly loading: boolean;
  /** Size of one internal pixel in CSS pixels. */
  readonly scale: number;
}

/** The top-10 table shown on the menu. */
export function HighScoreTable({
  entries,
  loading,
  scale,
}: HighScoreTableProps): ReactElement {
  if (entries.length === 0) {
    return (
      <span>{loading ? 'Loading high scores…' : 'No high scores yet'}</span>
    );
  }
  const cell = { padding: `0 ${4 * scale}px` };
  return (
    <table className="tabular-nums" style={{ lineHeight: 1.25 }}>
      <thead style={{ color: palette.hudAccent }}>
        <tr>
          <th style={cell}>#</th>
          <th style={cell}>Name</th>
          <th style={cell} className="text-right">
            Score
          </th>
          <th style={cell} className="text-right">
            Level
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          // Entries have no id; the rank is unique and stable for this list.
          <tr key={i}>
            <td style={cell}>{i + 1}</td>
            <td style={cell}>{entry.initials}</td>
            <td style={cell} className="text-right">
              {entry.score}
            </td>
            <td style={cell} className="text-right">
              {entry.level}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
