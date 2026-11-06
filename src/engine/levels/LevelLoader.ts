import type { GameConfig } from '../config/gameConfig';
import type { Brick } from '../entities/Brick';
import type { BrickFactory } from './BrickFactory';

/** A level as rows of brick characters, see the table in CLAUDE.md. */
export type LevelGrid = readonly string[];

/** Builds levels from grids. After the last level it loops to the first. */
export class LevelLoader {
  constructor(
    private readonly grids: readonly LevelGrid[],
    private readonly factory: BrickFactory,
    private readonly config: GameConfig,
  ) {
    if (grids.length === 0) throw new Error('No levels');
  }

  /** Bricks of the 1-based `levelNumber`, counting through loops. */
  load(levelNumber: number): Brick[] {
    const index = (levelNumber - 1) % this.grids.length;
    const grid = this.grids[index] ?? [];
    const bricks: Brick[] = [];
    grid.forEach((line, row) => {
      if (line.length !== this.config.bricks.columns) {
        throw new Error(
          `Level ${index + 1} row ${row + 1} has ${line.length} columns`,
        );
      }
      [...line].forEach((char, column) => {
        const brick = this.factory.create(char, column, row, levelNumber);
        if (brick) bricks.push(brick);
      });
    });
    if (!bricks.some((brick) => brick.breakable)) {
      throw new Error(`Level ${index + 1} has no breakable bricks`);
    }
    return bricks;
  }

  /** Ball speed for a level: a bit faster per level and per loop. */
  ballSpeed(levelNumber: number): number {
    const { ball, levels } = this.config;
    const index = (levelNumber - 1) % this.grids.length;
    const loop = Math.floor((levelNumber - 1) / this.grids.length);
    return (
      ball.speed *
      (1 + index * levels.speedIncreasePerLevel) *
      (1 + loop * levels.speedIncreasePerLoop)
    );
  }
}
