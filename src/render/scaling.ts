/**
 * Largest integer factor by which a view of `viewWidth`×`viewHeight` fits into
 * the available space. Integer factors keep pixel art crisp. Never below 1.
 */
export function computeScale(
  availableWidth: number,
  availableHeight: number,
  viewWidth: number,
  viewHeight: number,
): number {
  const scale = Math.floor(
    Math.min(availableWidth / viewWidth, availableHeight / viewHeight),
  );
  return Number.isFinite(scale) ? Math.max(1, scale) : 1;
}
