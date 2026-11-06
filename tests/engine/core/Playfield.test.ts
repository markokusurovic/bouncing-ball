import { describe, expect, it } from 'vitest';
import {
  gameConfig,
  type GameConfig,
} from '../../../src/engine/config/gameConfig';
import { EventBus } from '../../../src/engine/core/EventBus';
import type { GameEvents } from '../../../src/engine/core/events';
import { Playfield } from '../../../src/engine/core/Playfield';
import { Ball } from '../../../src/engine/entities/Ball';
import { Brick, type BrickKind } from '../../../src/engine/entities/Brick';
import { degToRad } from '../../../src/engine/physics/vector';
import { FakeRenderer, fixedRng } from '../../fakes';

const DT = 1 / 120;
const SPEED = gameConfig.ball.speed;

function brick(x: number, y: number, kind: BrickKind = 'normal'): Brick {
  const hits = kind === 'metal' ? Infinity : kind === 'silver' ? 2 : 1;
  return new Brick(x, y, 24, 8, kind, hits, 50, 'brick1');
}

function setup(
  options: { config?: GameConfig; rng?: number; bricks?: Brick[] } = {},
) {
  const config = options.config ?? gameConfig;
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  const types = [
    'ballLaunched',
    'paddleHit',
    'ballLost',
    'brickHit',
    'brickDestroyed',
  ] as const;
  for (const type of types) events.on(type, () => log.push(type));
  const field = new Playfield(events, fixedRng(options.rng ?? 0.5), config);
  field.start(options.bricks ?? [], config.ball.speed);
  return { field, log };
}

function firstBall(field: Playfield): Ball {
  const ball = field.balls[0];
  if (!ball) throw new Error('no ball');
  return ball;
}

function run(field: Playfield, updates: number): void {
  for (let i = 0; i < updates; i++) field.update(DT);
}

/** Puts the first ball in flight at a position with a velocity. */
function fly(
  field: Playfield,
  x: number,
  y: number,
  vx: number,
  vy: number,
): Ball {
  const ball = firstBall(field);
  ball.launch({ x: vx, y: vy });
  ball.x = x;
  ball.y = y;
  return ball;
}

describe('Playfield: paddle and ball', () => {
  it('starts with one ball resting on the paddle', () => {
    const { field } = setup();
    const ball = firstBall(field);
    expect(field.balls).toHaveLength(1);
    expect(ball.stuck).toBe(true);
    expect(ball.x).toBe(field.paddle.centerX);
    expect(ball.y).toBe(field.paddle.y - ball.radius);
  });

  it('keeps a stuck ball on the moving paddle', () => {
    const { field } = setup();
    field.movePaddleTo(50);
    field.update(DT);
    expect(firstBall(field).x).toBe(50);
    field.movePaddleBy(10);
    field.update(DT);
    expect(firstBall(field).x).toBe(60);
  });

  it('launches upwards at the current speed, tilted by the RNG', () => {
    const straight = setup({ rng: 0.5 });
    expect(straight.field.launch()).toBe(true);
    const ball = firstBall(straight.field);
    expect(ball.vx).toBeCloseTo(0);
    expect(ball.vy).toBeCloseTo(-SPEED);
    expect(straight.log).toEqual(['ballLaunched']);
    expect(straight.field.launch()).toBe(false);

    const tilted = setup({ rng: 0.99 });
    tilted.field.launch();
    expect(firstBall(tilted.field).vx).toBeGreaterThan(0);
  });

  it('bounces straight up from the paddle center', () => {
    const { field, log } = setup();
    const ball = fly(field, field.paddle.centerX, 200, 0, SPEED);
    run(field, 30);
    expect(log).toEqual(['paddleHit']);
    expect(ball.vy).toBeLessThan(0);
    expect(ball.vx).toBeCloseTo(0);
  });

  it('bounces at an angle from near the paddle edge', () => {
    const { field } = setup();
    const { paddle } = field;
    const ball = fly(field, paddle.x + paddle.width - 1, 200, 0, SPEED);
    run(field, 30);
    expect(Math.atan2(ball.vx, -ball.vy)).toBeCloseTo(
      degToRad(0.95 * gameConfig.bounce.maxAngleDegrees),
      1,
    );
  });

  it('enforces the minimum vertical angle on paddle bounces', () => {
    const config = {
      ...gameConfig,
      bounce: { maxAngleDegrees: 89, minVerticalAngleDegrees: 30 },
    };
    const { field } = setup({ config });
    const ball = fly(field, field.paddle.x + field.paddle.width, 200, 0, SPEED);
    run(field, 30);
    expect(Math.atan2(-ball.vy, Math.abs(ball.vx))).toBeCloseTo(degToRad(30));
  });

  it('pushes the ball out sideways when it hits a paddle end', () => {
    const { field } = setup();
    const { paddle } = field;
    const ball = fly(field, paddle.x - 2, paddle.y + 3, 50, 0);
    field.update(DT);
    expect(ball.vx).toBeLessThan(0);
    expect(ball.x).toBeLessThanOrEqual(paddle.x - ball.radius);

    fly(field, paddle.x + paddle.width + 2, paddle.y + 3, -50, 0);
    field.update(DT);
    expect(ball.vx).toBeGreaterThan(0);
  });

  it('does not tunnel through the paddle at very high speed', () => {
    const { field, log } = setup();
    const ball = fly(field, field.paddle.centerX, 150, 0, 20000);
    field.update(DT);
    expect(log).toEqual(['paddleHit']);
    expect(ball.vy).toBeLessThan(0);
  });

  it('bounces off the ceiling below the HUD strip', () => {
    const { field } = setup();
    const ball = fly(field, 100, 20, 0, -SPEED);
    run(field, 5);
    expect(ball.vy).toBeGreaterThan(0);
    expect(ball.y).toBeGreaterThanOrEqual(gameConfig.view.hudHeight);
  });

  it('announces a lost last ball and puts a new one on the paddle', () => {
    const { field, log } = setup();
    fly(field, 10, 235, 0, SPEED);
    run(field, 60);
    expect(log).toEqual(['ballLost']);
    expect(field.balls).toHaveLength(1);
    expect(firstBall(field).stuck).toBe(true);
  });

  it('does not announce a loss while another ball is still in play', () => {
    const { field, log } = setup();
    fly(field, 10, 235, 0, SPEED);
    const other = new Ball(3);
    other.launch({ x: 0, y: -SPEED });
    other.x = 100;
    other.y = 150;
    field.balls.push(other);
    run(field, 30);
    expect(log).toEqual([]);
    expect(field.balls).toEqual([other]);
  });
});

describe('Playfield: bricks', () => {
  it('destroys a normal brick hit from below and bounces down', () => {
    const target = brick(100, 50);
    const { field, log } = setup({ bricks: [target] });
    const ball = fly(field, 112, 70, 0, -SPEED);
    run(field, 30);
    expect(target.destroyed).toBe(true);
    expect(ball.vy).toBeGreaterThan(0);
    expect(log).toEqual(['brickDestroyed']);
    expect(field.cleared).toBe(true);
  });

  it('needs two hits for a silver brick', () => {
    const target = brick(100, 50, 'silver');
    const { field, log } = setup({ bricks: [target] });
    fly(field, 112, 70, 0, -SPEED);
    run(field, 30);
    expect(log).toEqual(['brickHit']);
    expect(field.cleared).toBe(false);
    fly(field, 112, 70, 0, -SPEED);
    run(field, 30);
    expect(log).toEqual(['brickHit', 'brickDestroyed']);
  });

  it('never breaks metal and counts a level with only metal as cleared', () => {
    const target = brick(100, 50, 'metal');
    const { field, log } = setup({ bricks: [target] });
    const ball = fly(field, 112, 70, 0, -SPEED);
    run(field, 30);
    expect(target.destroyed).toBe(false);
    expect(ball.vy).toBeGreaterThan(0);
    expect(log).toEqual(['brickHit']);
    expect(field.cleared).toBe(true);
  });

  it('reflects horizontally when hitting the side of a brick', () => {
    const target = brick(100, 50);
    const { field } = setup({ bricks: [target] });
    const ball = fly(field, 90, 54, SPEED, 0);
    run(field, 30);
    expect(target.destroyed).toBe(true);
    expect(ball.vx).toBeLessThan(0);
  });

  it('breaks both bricks at a seam but bounces only once', () => {
    const left = brick(100, 50);
    const right = brick(124, 50);
    const { field } = setup({ bricks: [left, right] });
    const ball = fly(field, 124, 70, 0, -SPEED);
    run(field, 30);
    expect(left.destroyed && right.destroyed).toBe(true);
    expect(ball.vy).toBeGreaterThan(0);
  });

  it('renders bricks with a gap, then the paddle and balls', () => {
    const gone = brick(10, 50);
    gone.hit();
    const { field } = setup({ bricks: [brick(100, 50), gone] });
    const renderer = new FakeRenderer();
    field.render(renderer);
    const ball = firstBall(field);
    const { paddle } = field;
    expect(renderer.calls).toEqual([
      { op: 'clear', color: 'playfield' },
      { op: 'rect', x: 100, y: 50, w: 23, h: 7, color: 'brick1' },
      {
        op: 'rect',
        x: paddle.x,
        y: paddle.y,
        w: paddle.width,
        h: paddle.height,
        color: 'paddle',
      },
      { op: 'rect', x: ball.x - 3, y: ball.y - 3, w: 6, h: 6, color: 'ball' },
    ]);
  });
});
