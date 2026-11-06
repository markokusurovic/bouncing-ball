import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/engine/config/gameConfig';
import { compileSprite } from '../../src/render/sprites/Sprite';
import { createSprites } from '../../src/render/sprites/sprites';

describe('compileSprite', () => {
  it('merges same-colored pixels into runs and skips transparent ones', () => {
    const runs = compileSprite({
      rows: ['aab.', '.aaa'],
      legend: { a: 'ball', b: 'paddle' },
    });
    expect(runs).toEqual([
      { x: 0, y: 0, width: 2, color: 'ball' },
      { x: 2, y: 0, width: 1, color: 'paddle' },
      { x: 1, y: 1, width: 3, color: 'ball' },
    ]);
  });

  it('rejects ragged rows and unknown characters', () => {
    expect(() =>
      compileSprite({ rows: ['aa', 'a'], legend: { a: 'ball' } }),
    ).toThrow('row 1');
    expect(() => compileSprite({ rows: ['z'], legend: {} })).toThrow('"z"');
  });
});

describe('sprites', () => {
  const sprites = createSprites(gameConfig);
  const size = (id: keyof typeof sprites): [number, number] => {
    const rows = sprites[id].rows;
    return [rows[0]?.length ?? 0, rows.length];
  };

  it('all compile', () => {
    for (const sprite of Object.values(sprites)) {
      expect(compileSprite(sprite).length).toBeGreaterThan(0);
    }
  });

  it('match the sizes of the things they draw', () => {
    const { bricks, paddle, ball, powerUps } = gameConfig;
    expect(size('brick1')).toEqual([bricks.width - 1, bricks.height - 1]);
    expect(size('brickMetal')).toEqual(size('brickSilverCracked'));
    expect(size('paddle')).toEqual([paddle.width, paddle.height]);
    expect(size('paddleWideLaser')).toEqual([
      paddle.width * powerUps.wideFactor,
      paddle.height,
    ]);
    expect(size('ball')).toEqual([ball.radius * 2, ball.radius * 2]);
    expect(size('capsuleLaser')).toEqual([
      powerUps.capsuleWidth,
      powerUps.capsuleHeight,
    ]);
    expect(size('bullet')).toEqual([
      powerUps.bulletWidth,
      powerUps.bulletHeight,
    ]);
  });
});
