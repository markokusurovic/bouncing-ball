import { describe, expect, it } from 'vitest';
import {
  gameConfig,
  type GameConfig,
} from '../../../src/engine/config/gameConfig';
import { Game } from '../../../src/engine/core/Game';
import type { GameEvents } from '../../../src/engine/core/events';
import type { Ball } from '../../../src/engine/entities/Ball';
import {
  Fire,
  MoveRight,
  MoveTo,
  Pause,
} from '../../../src/engine/input/commands';
import type { LevelGrid } from '../../../src/engine/levels/LevelLoader';
import { FakeInput, FakeRenderer, fixedRng } from '../../fakes';

const DT = 1 / 120;
/** One normal brick at the top-left: x 4–28, y 32–40. */
const ONE_BRICK: LevelGrid = ['1............'];

function setup(
  config: GameConfig = gameConfig,
  levels: readonly LevelGrid[] = [ONE_BRICK, ONE_BRICK],
) {
  const input = new FakeInput();
  const renderer = new FakeRenderer();
  const game = new Game({
    renderer,
    input,
    rng: fixedRng(0.5),
    config,
    levels,
  });
  const log: string[] = [];
  const record =
    <K extends keyof GameEvents>(type: K) =>
    (payload: GameEvents[K]): void => {
      log.push(`${type} ${JSON.stringify(payload)}`);
    };
  game.events.on('livesChanged', record('livesChanged'));
  game.events.on('levelStarted', record('levelStarted'));
  game.events.on('levelCleared', record('levelCleared'));
  game.events.on('gameOver', record('gameOver'));
  game.newGame();
  log.length = 0;
  return { game, input, renderer, log };
}

function ball(game: Game): Ball {
  const first = game.playfield.balls[0];
  if (!first) throw new Error('no ball');
  return first;
}

function run(game: Game, updates: number): void {
  for (let i = 0; i < updates; i++) game.update(DT);
}

/** Drops the ball below the screen and lets it fall out. */
function loseBall(game: Game): void {
  const b = ball(game);
  b.launch({ x: 0, y: 150 });
  b.x = 10;
  b.y = 238;
  run(game, 10);
}

/** Aims the ball at the ONE_BRICK brick from below. */
function hitTheBrick(game: Game): void {
  const b = ball(game);
  b.launch({ x: 0, y: -150 });
  b.x = 16;
  b.y = 50;
  run(game, 30);
}

describe('Game', () => {
  it('starts a new game on level 1 with 3 lives and no score', () => {
    const { game } = setup();
    expect(game.lives).toBe(3);
    expect(game.level).toBe(1);
    expect(game.scoring.score).toBe(0);
    expect(game.playfield.bricks).toHaveLength(1);
    expect(ball(game).stuck).toBe(true);
  });

  it('moves the paddle and launches the ball through commands', () => {
    const { game, input } = setup();
    const start = game.playfield.paddle.x;
    input.push(MoveRight);
    game.update(DT);
    expect(game.playfield.paddle.x).toBeCloseTo(
      start + gameConfig.paddle.speed * DT,
    );
    input.push(new MoveTo(50), Fire);
    game.update(DT);
    expect(ball(game).stuck).toBe(false);
    expect(ball(game).vy).toBeLessThan(0);
  });

  it('loses a life when the ball falls out', () => {
    const { game, log } = setup();
    loseBall(game);
    expect(game.lives).toBe(2);
    expect(log).toEqual(['livesChanged {"lives":2}']);
  });

  it('ends the game after the last life and restarts on Fire', () => {
    const { game, input, log } = setup();
    loseBall(game);
    loseBall(game);
    loseBall(game);
    expect(game.isOver).toBe(true);
    expect(log.at(-1)).toBe('gameOver {"score":0,"level":1}');

    input.push(Pause, MoveRight);
    const paddleX = game.playfield.paddle.x;
    game.update(DT);
    expect(game.isPaused).toBe(false);
    expect(game.playfield.paddle.x).toBe(paddleX);

    input.push(Fire);
    game.update(DT);
    expect(game.isOver).toBe(false);
    expect(game.lives).toBe(3);
  });

  it('clears a level, adds the bonus and starts the next one faster', () => {
    const { game, log } = setup();
    const levelOneSpeed = game.playfield.speed;
    hitTheBrick(game);
    expect(log).toEqual([
      'levelCleared {"level":1,"lives":3}',
      'levelStarted {"level":2}',
    ]);
    expect(game.level).toBe(2);
    expect(game.scoring.score).toBe(50 + 1000 + 3 * 500);
    expect(game.playfield.speed).toBeGreaterThan(levelOneSpeed);
    expect(ball(game).stuck).toBe(true);
  });

  it('awards an extra life at the score threshold', () => {
    const config = { ...gameConfig, lives: { start: 3, extraLifeEvery: 50 } };
    const { game } = setup(config, [['1...........1']]);
    hitTheBrick(game);
    expect(game.lives).toBe(4);
  });

  it('freezes everything while paused and resumes on the next Pause', () => {
    const { game, input } = setup();
    const b = ball(game);
    b.launch({ x: 50, y: -50 });
    b.x = 100;
    b.y = 100;
    input.push(Pause);
    game.update(DT);
    expect(game.isPaused).toBe(true);
    const paddleX = game.playfield.paddle.x;
    input.push(new MoveTo(10), MoveRight, Fire);
    run(game, 10);
    expect(b).toMatchObject({ x: 100, y: 100 });
    expect(game.playfield.paddle.x).toBe(paddleX);

    input.push(Pause);
    game.update(DT);
    expect(game.isPaused).toBe(false);
    expect(b.x).toBeGreaterThan(100);
  });

  it('renders the playfield', () => {
    const { game, renderer } = setup();
    game.render();
    expect(renderer.calls[0]).toEqual({ op: 'clear', color: 'playfield' });
    expect(renderer.calls[1]).toMatchObject({ color: 'brick1' });
  });

  it('uses the real levels by default', () => {
    const game = new Game({
      renderer: new FakeRenderer(),
      input: new FakeInput(),
      rng: fixedRng(0.5),
    });
    game.newGame();
    expect(game.playfield.bricks.length).toBeGreaterThan(20);
  });
});
