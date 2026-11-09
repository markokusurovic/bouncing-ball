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
  LetterBack,
  LetterDown,
  LetterUp,
  MoveRight,
  MoveTo,
  Mute,
  Pause,
} from '../../../src/engine/input/commands';
import type { LevelGrid } from '../../../src/engine/levels/LevelLoader';
import type { HighScore } from '../../../src/engine/scoring/highScores';
import {
  FakeAudio,
  FakeHighScores,
  flushPromises,
  FakeInput,
  FakeRenderer,
  fixedRng,
} from '../../fakes';

const DT = 1 / 120;
/** One normal brick at the top-left: x 4–28, y 32–40. */
const ONE_BRICK: LevelGrid = ['1............'];

function setup(
  config: GameConfig = gameConfig,
  levels: readonly LevelGrid[] = [ONE_BRICK, ONE_BRICK],
  scores: HighScore[] = [],
) {
  const input = new FakeInput();
  const renderer = new FakeRenderer();
  const audio = new FakeAudio();
  const highScores = new FakeHighScores(scores);
  const game = new Game({
    renderer,
    input,
    rng: fixedRng(0.5),
    audio,
    highScores,
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
  game.events.on('stateChanged', record('stateChanged'));
  game.start();
  return { game, input, renderer, audio, highScores, log };
}

/** A game already past the menu, with the log cleared. */
function playing(config?: GameConfig, levels?: readonly LevelGrid[]) {
  const context = setup(config, levels);
  context.game.newGame();
  context.log.length = 0;
  context.audio.calls.length = 0;
  return context;
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
  it('opens on the menu with the first level as a backdrop', () => {
    const { game, input, log } = setup();
    expect(game.state).toBe('menu');
    expect(log).toEqual(['stateChanged {"state":"menu"}']);
    expect(game.highScores).toEqual([]);
    expect(game.playfield.bricks).toHaveLength(1);
    input.push(new MoveTo(10));
    game.update(DT);
    expect(game.playfield.paddle.centerX).toBe(gameConfig.view.width / 2);
  });

  it('starts a new game on Fire with 3 lives and no score', () => {
    const { game, input, audio } = setup();
    input.push(Fire);
    game.update(DT);
    expect(game.state).toBe('playing');
    expect(game.lives).toBe(3);
    expect(game.level).toBe(1);
    expect(game.scoring.score).toBe(0);
    expect(ball(game).stuck).toBe(true);
    expect(audio.calls).toContain('music on');
  });

  it('moves the paddle and launches the ball through commands', () => {
    const { game, input, audio } = playing();
    const start = game.playfield.paddle.x;
    input.push(MoveRight);
    game.update(DT);
    expect(game.playfield.paddle.x).toBeCloseTo(
      start + gameConfig.paddle.speed * DT,
    );
    input.push(new MoveTo(50), Fire);
    game.update(DT);
    expect(ball(game).stuck).toBe(false);
    expect(audio.calls).toEqual(['launch']);
  });

  it('loses a life when the ball falls out', () => {
    const { game, log, audio } = playing();
    loseBall(game);
    expect(game.lives).toBe(2);
    expect(log).toEqual(['livesChanged {"lives":2}']);
    expect(audio.calls).toEqual(['lose']);
  });

  it('shows game over after the last life, then the menu after a delay', () => {
    const { game, input, log } = playing();
    loseBall(game);
    loseBall(game);
    loseBall(game);
    expect(game.state).toBe('gameOver');
    expect(log.slice(-2)).toEqual([
      'gameOver {"score":0,"level":1}',
      'stateChanged {"state":"gameOver"}',
    ]);

    input.push(Fire, Pause);
    game.update(DT);
    expect(game.state).toBe('gameOver');
    run(game, 120);
    input.push(Fire);
    game.update(DT);
    expect(game.state).toBe('menu');
    input.push(Fire);
    game.update(DT);
    expect(game.lives).toBe(3);
  });

  it('shows the level-clear screen, then starts the next level faster', () => {
    const { game, log } = playing();
    const levelOneSpeed = game.playfield.speed;
    hitTheBrick(game);
    expect(game.state).toBe('levelComplete');
    expect(log).toEqual([
      'levelCleared {"level":1,"lives":3}',
      'stateChanged {"state":"levelComplete"}',
    ]);
    expect(game.scoring.score).toBe(50 + 1000 + 3 * 500);
    run(game, 120 * 3);
    expect(game.state).toBe('playing');
    expect(game.level).toBe(2);
    expect(game.playfield.speed).toBeGreaterThan(levelOneSpeed);
    expect(ball(game).stuck).toBe(true);
  });

  it('skips the level-clear screen on Fire', () => {
    const { game, input } = playing();
    hitTheBrick(game);
    input.push(Fire);
    game.update(DT);
    expect(game.state).toBe('playing');
    expect(game.level).toBe(2);
  });

  it('awards an extra life at the score threshold', () => {
    const config = { ...gameConfig, lives: { start: 3, extraLifeEvery: 50 } };
    const { game } = playing(config, [['1...........1']]);
    hitTheBrick(game);
    expect(game.lives).toBe(4);
  });

  it('freezes everything while paused and resumes on the next Pause', () => {
    const { game, input, audio } = playing();
    const b = ball(game);
    b.launch({ x: 50, y: -50 });
    b.x = 100;
    b.y = 100;
    input.push(Pause);
    game.update(DT);
    expect(game.state).toBe('paused');
    const paddleX = game.playfield.paddle.x;
    input.push(new MoveTo(10), MoveRight, Fire);
    run(game, 10);
    expect(b).toMatchObject({ x: 100, y: 100 });
    expect(game.playfield.paddle.x).toBe(paddleX);

    input.push(Pause);
    game.update(DT);
    expect(game.state).toBe('playing');
    expect(b.x).toBeGreaterThan(100);
    expect(audio.calls).toEqual(['music off', 'music on']);
  });

  it('toggles mute through the sound director', () => {
    const { game, input, audio } = playing();
    input.push(Mute);
    game.update(DT);
    expect(audio.calls).toEqual(['mute']);
  });

  it('renders the playfield, then particles from destroyed bricks', () => {
    const { game, renderer } = playing(gameConfig, [
      ONE_BRICK,
      ['....1........'],
    ]);
    hitTheBrick(game);
    game.update(DT);
    game.render();
    expect(renderer.calls[0]).toEqual({ op: 'clear', color: 'playfield' });
    expect(renderer.calls.at(-1)).toMatchObject({
      op: 'rect',
      color: 'brick1',
    });
  });

  it('uses the real levels by default', () => {
    const game = new Game({
      renderer: new FakeRenderer(),
      input: new FakeInput(),
      rng: fixedRng(0.5),
      audio: new FakeAudio(),
      highScores: new FakeHighScores(),
    });
    expect(game.playfield.bricks.length).toBeGreaterThan(20);
  });
});

describe('Game: high scores', () => {
  const entry = (initials: string, score: number): HighScore => ({
    initials,
    score,
    level: 1,
  });

  /** Plays one brick (50 points), then loses all lives and leaves game over. */
  function scoreAndDie(game: Game, input: FakeInput): void {
    game.newGame();
    const b = ball(game);
    b.launch({ x: 0, y: -150 });
    b.x = 16;
    b.y = 50;
    run(game, 30);
    input.push(Fire);
    game.update(DT);
    loseBall(game);
    loseBall(game);
    loseBall(game);
    run(game, 121);
    input.push(Fire);
    game.update(DT);
  }

  it('loads the saved table sorted and trimmed, announcing loading', async () => {
    const many = Array.from({ length: 12 }, (_, i) => entry('AAA', i * 10));
    const { game } = setup(gameConfig, undefined, many);
    const loading: boolean[] = [];
    game.events.on('highScoresChanged', (e) => loading.push(e.loading));
    expect(game.highScores).toEqual([]);
    await flushPromises();
    expect(game.highScores).toHaveLength(10);
    expect(game.highScores[0]?.score).toBe(110);
    expect(loading).toEqual([false]);
  });

  it('keeps the current table when loading fails', async () => {
    const { game, highScores } = setup(gameConfig, undefined, [
      entry('OLD', 9),
    ]);
    await flushPromises();
    highScores.failing = true;
    const loading: boolean[] = [];
    game.events.on('highScoresChanged', (e) => loading.push(e.loading));
    await game.reloadHighScores();
    expect(game.highScores).toEqual([entry('OLD', 9)]);
    expect(loading).toEqual([true, false]);
  });

  it('keeps a new entry in the session table when storing it fails', async () => {
    const levels = [['1...........1']];
    const { game, input, highScores } = setup(gameConfig, levels);
    await flushPromises();
    highScores.failing = true;
    scoreAndDie(game, input);
    input.push(Fire, Fire, Fire);
    game.update(DT);
    await flushPromises();
    expect(game.state).toBe('menu');
    expect(game.highScores).toEqual([entry('AAA', 50)]);
    expect(highScores.loads).toBe(1);
  });

  it('asks for initials after a qualifying game and saves them', async () => {
    const levels = [['1...........1']];
    const { game, input, highScores } = setup(gameConfig, levels, [
      entry('OLD', 100),
    ]);
    await flushPromises();
    const initials: string[] = [];
    game.events.on('initialsChanged', ({ initials: value, cursor }) =>
      initials.push(`${value}@${cursor}`),
    );
    const tables: number[] = [];
    game.events.on('highScoresChanged', ({ entries }) =>
      tables.push(entries.length),
    );
    scoreAndDie(game, input);
    expect(game.state).toBe('highScoreEntry');
    expect(initials).toEqual(['AAA@0']);

    // B, then Z and Y (wrapping backwards), back to the first letter, then C.
    input.push(LetterUp, Fire, LetterDown, LetterDown, LetterBack, LetterUp);
    game.update(DT);
    expect(initials.at(-1)).toBe('CYA@0');
    input.push(Fire, Fire, Fire);
    game.update(DT);

    expect(game.state).toBe('menu');
    expect(game.highScores).toEqual([entry('OLD', 100), entry('CYA', 50)]);
    expect(tables).toEqual([2]);
    // Stored, then the (possibly shared) table is fetched again.
    await flushPromises();
    expect(highScores.added).toEqual([entry('CYA', 50)]);
    expect(highScores.loads).toBe(2);
    expect(tables).toEqual([2, 2, 2]);
  });

  it('skips initials when the score does not make the table', async () => {
    const full = Array.from({ length: 10 }, () => entry('TOP', 99_999));
    const { game, input, highScores } = setup(gameConfig, undefined, full);
    await flushPromises();
    scoreAndDie(game, input);
    expect(game.state).toBe('menu');
    expect(highScores.added).toEqual([]);
  });

  it('ignores letter commands outside the initials screen', () => {
    const { game, input } = playing();
    input.push(LetterUp, LetterBack);
    game.update(DT);
    expect(game.state).toBe('playing');
  });
});
