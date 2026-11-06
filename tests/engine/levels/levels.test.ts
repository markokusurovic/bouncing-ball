import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../../src/engine/config/gameConfig';
import { Brick } from '../../../src/engine/entities/Brick';
import { BrickFactory } from '../../../src/engine/levels/BrickFactory';
import { levels } from '../../../src/engine/levels/data';
import { LevelLoader } from '../../../src/engine/levels/LevelLoader';

const factory = new BrickFactory(gameConfig);

describe('Brick', () => {
  it('breaks after its hits and only reports the breaking hit', () => {
    const brick = new Brick(0, 0, 24, 8, 'silver', 2, 200, 'brickSilver');
    expect(brick.hit()).toBe(false);
    expect(brick.hit()).toBe(true);
    expect(brick.destroyed).toBe(true);
    expect(brick.hit()).toBe(false);
    expect(brick).toMatchObject({ centerX: 12, centerY: 4 });
  });

  it('picks its sprite by kind, color and damage', () => {
    expect(factory.create('3', 0, 0, 1)?.sprite).toBe('brick3');
    expect(factory.create('X', 0, 0, 1)?.sprite).toBe('brickMetal');
    const silver = factory.create('S', 0, 0, 1);
    expect(silver?.sprite).toBe('brickSilver');
    silver?.hit();
    expect(silver?.sprite).toBe('brickSilverCracked');
  });

  it('never breaks metal', () => {
    const brick = new Brick(0, 0, 24, 8, 'metal', Infinity, 0, 'brickMetal');
    expect(brick.hit()).toBe(false);
    expect(brick.breakable).toBe(false);
    expect(brick.destroyed).toBe(false);
  });
});

describe('BrickFactory', () => {
  it('maps characters to bricks at grid positions', () => {
    expect(factory.create('.', 0, 0, 1)).toBeNull();
    expect(factory.create('1', 0, 0, 1)).toMatchObject({
      kind: 'normal',
      x: 4,
      y: 32,
      points: 50,
      color: 'brick1',
      hitsLeft: 1,
    });
    expect(factory.create('4', 2, 3, 1)).toMatchObject({
      x: 4 + 2 * 24,
      y: 32 + 3 * 8,
      points: 80,
      color: 'brick4',
    });
    expect(factory.create('S', 0, 0, 1)).toMatchObject({
      kind: 'silver',
      points: 200,
      hitsLeft: 2,
    });
    expect(factory.create('X', 0, 0, 1)).toMatchObject({ kind: 'metal' });
  });

  it('rejects unknown characters', () => {
    expect(() => factory.create('?', 0, 0, 1)).toThrow('Unknown brick');
  });

  it('makes silver bricks tougher on later levels, up to the maximum', () => {
    expect(factory.silverHits(5)).toBe(2);
    expect(factory.silverHits(6)).toBe(3);
    expect(factory.silverHits(40)).toBe(3);
  });
});

describe('LevelLoader', () => {
  it('builds bricks for a grid and skips empty cells', () => {
    const loader = new LevelLoader(
      [['1.S..........', '............X']],
      factory,
      gameConfig,
    );
    expect(loader.load(1).map((brick) => brick.kind)).toEqual([
      'normal',
      'silver',
      'metal',
    ]);
  });

  it('rejects malformed levels', () => {
    expect(() => new LevelLoader([], factory, gameConfig)).toThrow();
    const short = new LevelLoader([['111']], factory, gameConfig);
    expect(() => short.load(1)).toThrow('3 columns');
    const metal = new LevelLoader([['X............']], factory, gameConfig);
    expect(() => metal.load(1)).toThrow('no breakable');
  });

  it('loops through the levels with rising ball speed', () => {
    const loader = new LevelLoader(levels, factory, gameConfig);
    const base = gameConfig.ball.speed;
    expect(loader.ballSpeed(1)).toBe(base);
    expect(loader.ballSpeed(2)).toBeCloseTo(base * 1.04);
    expect(loader.ballSpeed(11)).toBeCloseTo(base * 1.15);
    expect(loader.load(11)).toHaveLength(loader.load(1).length);
  });

  it('has 10 valid levels', () => {
    const loader = new LevelLoader(levels, factory, gameConfig);
    expect(levels).toHaveLength(10);
    for (let n = 1; n <= 10; n++) {
      const bricks = loader.load(n);
      expect(bricks.some((brick) => brick.breakable)).toBe(true);
      for (const brick of bricks) {
        expect(brick.y + brick.height).toBeLessThan(gameConfig.paddle.y - 60);
      }
    }
  });
});
