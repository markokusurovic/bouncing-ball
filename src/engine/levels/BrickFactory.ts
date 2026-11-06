import type { GameConfig } from '../config/gameConfig';
import { Brick } from '../entities/Brick';
import type { PaletteKey } from '../../theme/palette';

const NORMAL_COLORS: readonly PaletteKey[] = [
  'brick1',
  'brick2',
  'brick3',
  'brick4',
];

/** Factory: turns one level grid character into a brick (or nothing). */
export class BrickFactory {
  constructor(private readonly config: GameConfig) {}

  /**
   * @param levelNumber 1-based level count including loops; silver bricks get
   * tougher as it grows.
   */
  create(
    char: string,
    column: number,
    row: number,
    levelNumber: number,
  ): Brick | null {
    if (char === '.') return null;
    const b = this.config.bricks;
    const x = b.left + column * b.width;
    const y = b.top + row * b.height;
    const make = (
      kind: Brick['kind'],
      hits: number,
      points: number,
      color: PaletteKey,
    ): Brick => new Brick(x, y, b.width, b.height, kind, hits, points, color);

    const normal = '1234'.indexOf(char);
    const points = b.normalPoints[normal];
    const color = NORMAL_COLORS[normal];
    if (points !== undefined && color !== undefined) {
      return make('normal', 1, points, color);
    }
    if (char === 'S') {
      return make(
        'silver',
        this.silverHits(levelNumber),
        b.silverPoints,
        'brickSilver',
      );
    }
    if (char === 'X') return make('metal', Infinity, 0, 'brickMetal');
    throw new Error(`Unknown brick character "${char}"`);
  }

  silverHits(levelNumber: number): number {
    const b = this.config.bricks;
    const extra = Math.floor((levelNumber - 1) / b.silverLevelsPerExtraHit);
    return Math.min(b.silverMaxHits, b.silverBaseHits + extra);
  }
}
