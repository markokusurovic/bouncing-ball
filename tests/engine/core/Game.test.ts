import { describe, expect, it } from 'vitest';
import {
  gameConfig,
  type GameConfig,
} from '../../../src/engine/config/gameConfig';
import { Game } from '../../../src/engine/core/Game';
import type { GameEvents } from '../../../src/engine/core/events';
import {
  Fire,
  MoveRight,
  MoveTo,
  Pause,
} from '../../../src/engine/input/commands';
import { degToRad } from '../../../src/engine/physics/vector';
import { FakeInput, FakeRenderer, fixedRng } from '../../fakes';

const DT = 1 / 120;

function setup(config: GameConfig = gameConfig, rngValue = 0.5) {
  const input = new FakeInput();
  const renderer = new FakeRenderer();
  const game = new Game({ renderer, input, rng: fixedRng(rngValue), config });
  const events: (keyof GameEvents)[] = [];
  game.events.on('ballLaunched', () => events.push('ballLaunched'));
  game.events.on('paddleHit', () => events.push('paddleHit'));
  game.events.on('ballLost', () => events.push('ballLost'));
  return { game, input, renderer, events };
}

function run(game: Game, updates: number): void {
  for (let i = 0; i < updates; i++) game.update(DT);
}

/** Puts the ball in flight at a position with a velocity. */
function fly(game: Game, x: number, y: number, vx: number, vy: number): void {
  game.ball.launch({ x: vx, y: vy });
  game.ball.x = x;
  game.ball.y = y;
}

describe('Game', () => {
  it('starts with the ball resting on the paddle', () => {
    const { game } = setup();
    expect(game.ball.stuck).toBe(true);
    expect(game.ball.x).toBe(game.paddle.centerX);
    expect(game.ball.y).toBe(game.paddle.y - game.ball.radius);
  });

  it('keeps the stuck ball on the paddle as it moves', () => {
    const { game, input } = setup();
    input.push(new MoveTo(50));
    game.update(DT);
    expect(game.ball.x).toBe(50);
  });

  it('moves the paddle with keyboard speed', () => {
    const { game, input } = setup();
    const start = game.paddle.x;
    input.push(MoveRight);
    game.update(DT);
    expect(game.paddle.x).toBeCloseTo(start + gameConfig.paddle.speed * DT);
  });

  it('launches the ball upwards on Fire, tilted by the RNG', () => {
    const straight = setup(gameConfig, 0.5);
    straight.input.push(Fire);
    straight.game.update(DT);
    expect(straight.game.ball.stuck).toBe(false);
    expect(straight.game.ball.vx).toBeCloseTo(0);
    expect(straight.game.ball.vy).toBeCloseTo(-gameConfig.ball.speed);
    expect(straight.events).toEqual(['ballLaunched']);

    const tilted = setup(gameConfig, 0.99);
    tilted.input.push(Fire);
    tilted.game.update(DT);
    expect(tilted.game.ball.vx).toBeGreaterThan(0);
  });

  it('ignores Fire while the ball is in flight', () => {
    const { game, input, events } = setup();
    input.push(Fire);
    game.update(DT);
    input.push(Fire);
    game.update(DT);
    expect(events).toEqual(['ballLaunched']);
  });

  it('bounces straight up from the paddle center', () => {
    const { game, events } = setup();
    fly(game, game.paddle.centerX, 200, 0, gameConfig.ball.speed);
    run(game, 30);
    expect(events).toEqual(['paddleHit']);
    expect(game.ball.vy).toBeLessThan(0);
    expect(game.ball.vx).toBeCloseTo(0);
  });

  it('bounces at an angle from near the paddle edge', () => {
    const { game } = setup();
    const { paddle } = game;
    fly(game, paddle.x + paddle.width - 1, 200, 0, gameConfig.ball.speed);
    run(game, 30);
    const angle = Math.atan2(game.ball.vx, -game.ball.vy);
    expect(angle).toBeCloseTo(
      degToRad(0.95 * gameConfig.bounce.maxAngleDegrees),
      1,
    );
  });

  it('enforces the minimum vertical angle on paddle bounces', () => {
    const config = {
      ...gameConfig,
      bounce: { maxAngleDegrees: 89, minVerticalAngleDegrees: 30 },
    };
    const { game } = setup(config);
    fly(game, game.paddle.x + game.paddle.width, 200, 0, gameConfig.ball.speed);
    run(game, 30);
    const fromHorizontal = Math.atan2(-game.ball.vy, Math.abs(game.ball.vx));
    expect(fromHorizontal).toBeCloseTo(degToRad(30));
  });

  it('pushes the ball out sideways when it hits a paddle end', () => {
    const { game } = setup();
    const { paddle } = game;
    fly(game, paddle.x - 2, paddle.y + 3, 50, 0);
    game.update(DT);
    expect(game.ball.vx).toBeLessThan(0);
    expect(game.ball.x).toBeLessThanOrEqual(paddle.x - game.ball.radius);

    fly(game, paddle.x + paddle.width + 2, paddle.y + 3, -50, 0);
    game.update(DT);
    expect(game.ball.vx).toBeGreaterThan(0);
  });

  it('does not tunnel through the paddle at very high speed', () => {
    const config = {
      ...gameConfig,
      ball: { ...gameConfig.ball, speed: 20000 },
    };
    const { game, events } = setup(config);
    fly(game, game.paddle.centerX, 150, 0, 20000);
    game.update(DT);
    expect(events).toEqual(['paddleHit']);
    expect(game.ball.vy).toBeLessThan(0);
  });

  it('loses the ball below the screen and puts it back on the paddle', () => {
    const { game, events } = setup();
    fly(game, 10, 235, 0, gameConfig.ball.speed);
    run(game, 60);
    expect(events).toEqual(['ballLost']);
    expect(game.ball.stuck).toBe(true);
    expect(game.ball.x).toBe(game.paddle.centerX);
  });

  it('freezes everything while paused and resumes on the next Pause', () => {
    const { game, input } = setup();
    fly(game, 100, 100, 50, -50);
    input.push(Pause);
    game.update(DT);
    expect(game.isPaused).toBe(true);
    const paddleX = game.paddle.x;
    input.push(new MoveTo(10), MoveRight, Fire);
    run(game, 10);
    expect(game.ball).toMatchObject({ x: 100, y: 100 });
    expect(game.paddle.x).toBe(paddleX);

    input.push(Pause);
    game.update(DT);
    expect(game.isPaused).toBe(false);
    expect(game.ball.x).toBeGreaterThan(100);
  });

  it('renders the playfield, paddle and ball', () => {
    const { game, renderer } = setup();
    game.render();
    const { paddle, ball } = game;
    expect(renderer.calls).toEqual([
      { op: 'clear', color: 'playfield' },
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
