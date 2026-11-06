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

  it('draws brick sprites, then the paddle and balls', () => {
    const gone = brick(10, 50);
    gone.hit();
    const { field } = setup({ bricks: [brick(100, 50), gone] });
    const renderer = new FakeRenderer();
    field.render(renderer);
    const ball = firstBall(field);
    expect(renderer.calls).toEqual([
      { op: 'clear', color: 'playfield' },
      { op: 'sprite', id: 'brick1', x: 100, y: 50 },
      { op: 'sprite', id: 'paddle', x: field.paddle.x, y: field.paddle.y },
      { op: 'sprite', id: 'ball', x: ball.x - 3, y: ball.y - 3 },
    ]);
  });
});

describe('Playfield: power-ups', () => {
  /** rng 0.1 always drops a capsule, and index 0 makes it Wide. */
  it('drops a capsule from a destroyed brick that the paddle can catch', () => {
    const target = brick(148, 50);
    const { field } = setup({ rng: 0.1, bricks: [target] });
    fly(field, 160, 70, 0, -SPEED);
    run(field, 10);
    const capsule = field.capsules.items.find((c) => c.active);
    expect(capsule).toMatchObject({ type: 'wide' });
    run(field, 120 * 4);
    expect(capsule?.active).toBe(false);
    expect(field.paddle.width).toBe(60);
    expect(field.powerUps.isActive('wide')).toBe(true);
  });

  it('lets a missed capsule fall out', () => {
    const { field } = setup({ rng: 0.1, bricks: [brick(4, 50)] });
    field.movePaddleTo(300);
    fly(field, 16, 70, 0, -SPEED);
    run(field, 120 * 5);
    expect(field.capsules.items.some((c) => c.active)).toBe(false);
    expect(field.paddle.width).toBe(40);
  });

  it('rescales flying balls when the speed factor changes', () => {
    const { field } = setup();
    const ball = fly(field, 100, 100, 90, -120);
    field.setSpeedFactor(0.6);
    expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(SPEED * 0.6);
    expect(field.ballSpeed).toBeCloseTo(SPEED * 0.6);
    field.setSpeedFactor(1);
    expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(SPEED);
  });

  it('splits into three balls, costing a life only when all are lost', () => {
    const { field, log } = setup();
    fly(field, 100, 200, 0, SPEED);
    field.splitBalls();
    expect(field.balls).toHaveLength(3);
    for (const ball of field.balls) {
      expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(SPEED);
      expect(ball.vy).toBeGreaterThan(0);
    }
    field.movePaddleTo(300);
    run(field, 120);
    expect(log).toEqual(['ballLost']);
    expect(field.balls).toHaveLength(1);
  });

  it('caps the number of balls and keeps split balls stuck when waiting', () => {
    const { field } = setup();
    for (let i = 0; i < 5; i++) field.splitBalls();
    expect(field.balls).toHaveLength(gameConfig.powerUps.multiMaxBalls);
    expect(field.balls.every((ball) => ball.stuck)).toBe(true);
  });

  it('fires the laser at most once per cooldown', () => {
    const { field } = setup();
    fly(field, 100, 100, 0, -SPEED);
    field.fire();
    expect(field.bullets.items.some((b) => b.active)).toBe(false);
    field.setLaser(true);
    field.fire();
    field.fire();
    expect(field.bullets.items.filter((b) => b.active)).toHaveLength(1);
    run(field, 121);
    field.fire();
    expect(field.bullets.items.filter((b) => b.active)).toHaveLength(1);
  });

  it('stops a bullet at the first brick in its path', () => {
    const near = brick(148, 120);
    const far = brick(148, 60, 'metal');
    const { field, log } = setup({ bricks: [far, near] });
    // A ball rolling sideways below the bricks stays in play the whole test.
    fly(field, 10, 160, SPEED, 0);
    field.setLaser(true);
    field.fire();
    run(field, 121);
    expect(near.destroyed).toBe(true);
    expect(log).toEqual(['brickDestroyed']);
    field.fire();
    run(field, 120);
    expect(log).toEqual(['brickDestroyed', 'brickHit']);
    expect(field.bullets.items.some((b) => b.active)).toBe(false);
  });

  it('lets a bullet that hits nothing leave at the top', () => {
    const { field } = setup();
    fly(field, 10, 100, 0, -SPEED);
    field.setLaser(true);
    field.fire();
    run(field, 120);
    expect(field.bullets.items.some((b) => b.active)).toBe(false);
  });

  it('ends power-ups when the last ball is lost', () => {
    const { field } = setup();
    field.powerUps.activate('wide');
    field.powerUps.activate('laser');
    fly(field, 10, 235, 0, SPEED);
    run(field, 30);
    expect(field.paddle.width).toBe(40);
    expect(field.laserEnabled).toBe(false);
  });

  it('draws capsules, bullets and the right paddle sprite', () => {
    const { field } = setup();
    field.capsules.acquire()?.drop('slow', 100, 100);
    field.setLaser(true);
    fly(field, 10, 100, 0, -SPEED);
    field.fire();
    const ids = (): string[] => {
      const renderer = new FakeRenderer();
      field.render(renderer);
      return renderer.calls.map((call) =>
        call.op === 'sprite' ? call.id : call.op,
      );
    };
    expect(ids()).toEqual([
      'clear',
      'capsuleSlow',
      'bullet',
      'paddleLaser',
      'ball',
    ]);
    field.setPaddleWidthFactor(1.5);
    expect(ids()).toContain('paddleWideLaser');
    field.setLaser(false);
    expect(ids()).toContain('paddleWide');
  });
});
