import { gameConfig, type GameConfig } from '../config/gameConfig';
import type { GameActions } from '../input/commands';
import { BrickFactory } from '../levels/BrickFactory';
import { levels as defaultLevels } from '../levels/data';
import { LevelLoader, type LevelGrid } from '../levels/LevelLoader';
import { ScoreManager } from '../scoring/ScoreManager';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { LoopTarget } from './GameLoop';
import type { InputSource, Renderer, Rng } from './interfaces';
import { Playfield } from './Playfield';

export interface GameDependencies {
  readonly renderer: Renderer;
  readonly input: InputSource;
  readonly rng: Rng;
  readonly config?: GameConfig;
  readonly levels?: readonly LevelGrid[];
}

/**
 * Composition root of the engine. Everything external is injected. Owns the
 * playfield, score, lives and level progression. Call `newGame()` to start,
 * after subscribing to `events`.
 */
export class Game implements LoopTarget, GameActions {
  readonly events = new EventBus<GameEvents>();
  readonly playfield: Playfield;
  readonly scoring: ScoreManager;
  private readonly renderer: Renderer;
  private readonly input: InputSource;
  private readonly config: GameConfig;
  private readonly levels: LevelLoader;
  private livesLeft = 0;
  private levelNumber = 1;
  private paused = false;
  private over = false;
  /** Length of the current update, used by commands. */
  private dt = 0;

  constructor({
    renderer,
    input,
    rng,
    config = gameConfig,
    levels = defaultLevels,
  }: GameDependencies) {
    this.renderer = renderer;
    this.input = input;
    this.config = config;
    this.levels = new LevelLoader(levels, new BrickFactory(config), config);
    this.scoring = new ScoreManager(this.events, config);
    this.playfield = new Playfield(this.events, rng, config);
    this.events.on('ballLost', () => this.loseLife());
    this.events.on('extraLife', () => this.setLives(this.livesLeft + 1));
  }

  get lives(): number {
    return this.livesLeft;
  }

  get level(): number {
    return this.levelNumber;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get isOver(): boolean {
    return this.over;
  }

  newGame(): void {
    this.over = false;
    this.paused = false;
    this.scoring.reset();
    this.setLives(this.config.lives.start);
    this.startLevel(1);
  }

  update(dt: number): void {
    this.dt = dt;
    for (const command of this.input.poll()) command.execute(this);
    if (this.paused || this.over) return;
    this.playfield.update(dt);
    if (this.playfield.cleared) {
      this.events.emit('levelCleared', {
        level: this.levelNumber,
        lives: this.livesLeft,
      });
      this.startLevel(this.levelNumber + 1);
    }
  }

  render(): void {
    this.playfield.render(this.renderer);
  }

  movePaddleBy(direction: -1 | 1): void {
    if (this.paused || this.over) return;
    this.playfield.movePaddleBy(direction * this.config.paddle.speed * this.dt);
  }

  movePaddleTo(centerX: number): void {
    if (this.paused || this.over) return;
    this.playfield.movePaddleTo(centerX);
  }

  fire(): void {
    if (this.paused) return;
    if (this.over) this.newGame();
    else this.playfield.fire();
  }

  togglePause(): void {
    if (!this.over) this.paused = !this.paused;
  }

  private startLevel(levelNumber: number): void {
    this.levelNumber = levelNumber;
    this.playfield.start(
      this.levels.load(levelNumber),
      this.levels.ballSpeed(levelNumber),
    );
    this.events.emit('levelStarted', { level: levelNumber });
  }

  private loseLife(): void {
    this.setLives(this.livesLeft - 1);
    if (this.livesLeft > 0) return;
    this.over = true;
    this.events.emit('gameOver', {
      score: this.scoring.score,
      level: this.levelNumber,
    });
  }

  private setLives(lives: number): void {
    this.livesLeft = lives;
    this.events.emit('livesChanged', { lives });
  }
}
