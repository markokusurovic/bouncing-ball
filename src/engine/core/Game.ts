import { connectAudio } from '../audio/connectAudio';
import { gameConfig, type GameConfig } from '../config/gameConfig';
import { ParticleSystem } from '../entities/Particle';
import type { GameActions } from '../input/commands';
import { BrickFactory } from '../levels/BrickFactory';
import { levels as defaultLevels } from '../levels/data';
import { LevelLoader, type LevelGrid } from '../levels/LevelLoader';
import { insertScore, qualifies, type HighScore } from '../scoring/highScores';
import { ScoreManager } from '../scoring/ScoreManager';
import type { GameState, StateContext, StateName } from '../states/GameState';
import {
  GameOverState,
  HighScoreEntryState,
  LevelCompleteState,
  MenuState,
  PausedState,
  PlayingState,
} from '../states/states';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { LoopTarget } from './GameLoop';
import type {
  AudioPlayer,
  HighScoreRepository,
  InputSource,
  Renderer,
  Rng,
} from './interfaces';
import { Playfield } from './Playfield';

export interface GameDependencies {
  readonly renderer: Renderer;
  readonly input: InputSource;
  readonly rng: Rng;
  readonly audio: AudioPlayer;
  readonly highScores: HighScoreRepository;
  readonly config?: GameConfig;
  readonly levels?: readonly LevelGrid[];
}

/**
 * Composition root of the engine. Everything external is injected. Owns the
 * playfield, score, lives, level progression and the screen state machine.
 * Subscribe to `events`, then call `start()` to show the menu.
 */
export class Game implements LoopTarget, GameActions, StateContext {
  readonly events = new EventBus<GameEvents>();
  readonly playfield: Playfield;
  readonly particles: ParticleSystem;
  readonly scoring: ScoreManager;
  private readonly renderer: Renderer;
  private readonly input: InputSource;
  private readonly config: GameConfig;
  private readonly levels: LevelLoader;
  private readonly states: Readonly<Record<StateName, GameState>>;
  private readonly highScoreRepository: HighScoreRepository;
  private highScoreTable: HighScore[];
  private current: GameState;
  private livesLeft = 0;
  private levelNumber = 1;
  /** Length of the current update, used by commands. */
  private dt = 0;

  constructor({
    renderer,
    input,
    rng,
    audio,
    highScores,
    config = gameConfig,
    levels = defaultLevels,
  }: GameDependencies) {
    this.highScoreRepository = highScores;
    this.highScoreTable = highScores
      .load()
      .sort((a, b) => b.score - a.score)
      .slice(0, config.highScores.maxEntries);
    this.renderer = renderer;
    this.input = input;
    this.config = config;
    this.levels = new LevelLoader(levels, new BrickFactory(config), config);
    this.scoring = new ScoreManager(this.events, config);
    this.playfield = new Playfield(this.events, rng, config);
    this.particles = new ParticleSystem(this.events, rng, config);
    connectAudio(this.events, audio);
    this.events.on('ballLost', () => this.loseLife());
    this.events.on('extraLife', () => this.setLives(this.livesLeft + 1));
    this.states = {
      menu: new MenuState(this),
      playing: new PlayingState(this),
      paused: new PausedState(this),
      levelComplete: new LevelCompleteState(this, config),
      gameOver: new GameOverState(this, config),
      highScoreEntry: new HighScoreEntryState(this, config),
    };
    this.current = this.states.menu;
    // The first level sits behind the menu as a backdrop.
    this.startLevel(1);
  }

  get state(): StateName {
    return this.current.name;
  }

  get highScores(): readonly HighScore[] {
    return this.highScoreTable;
  }

  get lives(): number {
    return this.livesLeft;
  }

  get level(): number {
    return this.levelNumber;
  }

  /** Announces the high scores and shows the menu. */
  start(): void {
    this.events.emit('highScoresChanged', { entries: this.highScoreTable });
    this.setState('menu');
  }

  leaveGameOver(): void {
    const { maxEntries } = this.config.highScores;
    const isHighScore = qualifies(
      this.highScoreTable,
      this.scoring.score,
      maxEntries,
    );
    this.setState(isHighScore ? 'highScoreEntry' : 'menu');
  }

  submitInitials(initials: string): void {
    this.highScoreTable = insertScore(
      this.highScoreTable,
      { initials, score: this.scoring.score, level: this.levelNumber },
      this.config.highScores.maxEntries,
    );
    this.highScoreRepository.save(this.highScoreTable);
    this.events.emit('highScoresChanged', { entries: this.highScoreTable });
    this.setState('menu');
  }

  setState(name: StateName): void {
    this.current = this.states[name];
    this.current.enter();
    this.events.emit('stateChanged', { state: name });
  }

  newGame(): void {
    this.scoring.reset();
    this.particles.clear();
    this.setLives(this.config.lives.start);
    this.startLevel(1);
    this.setState('playing');
  }

  completeLevel(): void {
    this.events.emit('levelCleared', {
      level: this.levelNumber,
      lives: this.livesLeft,
    });
    this.setState('levelComplete');
  }

  nextLevel(): void {
    this.startLevel(this.levelNumber + 1);
    this.setState('playing');
  }

  update(dt: number): void {
    this.dt = dt;
    for (const command of this.input.poll()) command.execute(this);
    this.current.update(dt);
  }

  render(): void {
    this.playfield.render(this.renderer);
    this.particles.render(this.renderer);
  }

  movePaddleBy(direction: -1 | 1): void {
    this.current.movePaddleBy(direction * this.config.paddle.speed * this.dt);
  }

  movePaddleTo(centerX: number): void {
    this.current.movePaddleTo(centerX);
  }

  fire(): void {
    this.current.fire();
  }

  togglePause(): void {
    this.current.togglePause();
  }

  toggleMute(): void {
    this.events.emit('muteToggled', {});
  }

  changeLetter(direction: -1 | 1): void {
    this.current.changeLetter(direction);
  }

  previousLetter(): void {
    this.current.previousLetter();
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
    this.events.emit('gameOver', {
      score: this.scoring.score,
      level: this.levelNumber,
    });
    this.setState('gameOver');
  }

  private setLives(lives: number): void {
    this.livesLeft = lives;
    this.events.emit('livesChanged', { lives });
  }
}
