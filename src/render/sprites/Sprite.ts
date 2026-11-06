import type { PaletteKey } from '../../theme/palette';

/**
 * A pixel-art image as text: one string per row, one character per pixel.
 * `legend` maps characters to palette keys; `.` is transparent.
 */
export interface Sprite {
  readonly rows: readonly string[];
  readonly legend: Readonly<Record<string, PaletteKey>>;
}

/** A horizontal run of same-colored pixels, drawn with one fillRect. */
export interface PixelRun {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly color: PaletteKey;
}

/** Turns a sprite into runs once, so drawing it is a few fillRects. */
export function compileSprite(sprite: Sprite): PixelRun[] {
  const width = sprite.rows[0]?.length ?? 0;
  const runs: PixelRun[] = [];
  sprite.rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(
        `Sprite row ${y} is ${row.length} wide, expected ${width}`,
      );
    }
    let x = 0;
    while (x < row.length) {
      const char = row.charAt(x);
      let end = x + 1;
      while (row.charAt(end) === char && end < row.length) end++;
      if (char !== '.') {
        const color = sprite.legend[char];
        if (!color) throw new Error(`Sprite character "${char}" has no color`);
        runs.push({ x, y, width: end - x, color });
      }
      x = end;
    }
  });
  return runs;
}
