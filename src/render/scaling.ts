/**
 * Factor by which a view of `viewWidth`×`viewHeight` is drawn into the
 * available space. Integer factors keep pixel art crisp, so the largest one
 * that fits is used while it fills at least `minIntegerFill` of the space.
 * On small screens (phones) that would waste too much room, so the exact
 * fractional fit is used instead. Falls back to 1 for empty input.
 */
export function computeScale(
  availableWidth: number,
  availableHeight: number,
  viewWidth: number,
  viewHeight: number,
  minIntegerFill = 0.8,
): number {
  const fit = Math.min(
    availableWidth / viewWidth,
    availableHeight / viewHeight,
  );
  if (!Number.isFinite(fit) || fit <= 0) return 1;
  const integer = Math.floor(fit);
  return integer >= 1 && integer >= fit * minIntegerFill ? integer : fit;
}
