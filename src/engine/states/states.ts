import type { GameConfig } from '../config/gameConfig';
import { BaseState, type StateContext } from './GameState';

/** Title screen. Fire starts a new game. */
export class MenuState extends BaseState {
  readonly name = 'menu';
  override fire(): void {
    this.ctx.newGame();
  }
}

export class PlayingState extends BaseState {
  readonly name = 'playing';

  override update(dt: number): void {
    super.update(dt);
    this.ctx.playfield.update(dt);
    // Losing the last life during the update already left this state.
    if (this.ctx.state === 'playing' && this.ctx.playfield.cleared) {
      this.ctx.completeLevel();
    }
  }
  override fire(): void {
    this.ctx.playfield.fire();
  }
  override togglePause(): void {
    this.ctx.setState('paused');
  }
  override movePaddleBy(dx: number): void {
    this.ctx.playfield.movePaddleBy(dx);
  }
  override movePaddleTo(centerX: number): void {
    this.ctx.playfield.movePaddleTo(centerX);
  }
}

/** Everything is frozen until Pause is pressed again. */
export class PausedState extends BaseState {
  readonly name = 'paused';
  override update(): void {}
  override togglePause(): void {
    this.ctx.setState('playing');
  }
}

/** Shows the cleared level for a moment; Fire skips ahead. */
export class LevelCompleteState extends BaseState {
  readonly name = 'levelComplete';
  private timeLeft = 0;

  constructor(
    ctx: StateContext,
    private readonly config: GameConfig,
  ) {
    super(ctx);
  }

  override enter(): void {
    this.timeLeft = this.config.screens.levelCompleteSeconds;
  }
  override update(dt: number): void {
    super.update(dt);
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.ctx.nextLevel();
  }
  override fire(): void {
    this.ctx.nextLevel();
  }
}

/** After a short delay, Fire moves on to initials entry or the menu. */
export class GameOverState extends BaseState {
  readonly name = 'gameOver';
  private timeLeft = 0;

  constructor(
    ctx: StateContext,
    private readonly config: GameConfig,
  ) {
    super(ctx);
  }

  override enter(): void {
    this.timeLeft = this.config.screens.gameOverDelaySeconds;
  }
  override update(dt: number): void {
    super.update(dt);
    this.timeLeft -= dt;
  }
  override fire(): void {
    if (this.timeLeft <= 0) this.ctx.leaveGameOver();
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Arcade-style initials: Up/Down cycle the current letter, Fire confirms it,
 * Backspace goes back. Confirming the last letter saves the score.
 */
export class HighScoreEntryState extends BaseState {
  readonly name = 'highScoreEntry';
  private letters: number[] = [];
  private cursor = 0;

  constructor(
    ctx: StateContext,
    private readonly config: GameConfig,
  ) {
    super(ctx);
  }

  get initials(): string {
    return this.letters.map((i) => ALPHABET.charAt(i)).join('');
  }

  override enter(): void {
    this.letters = Array.from(
      { length: this.config.highScores.initialsLength },
      () => 0,
    );
    this.cursor = 0;
    this.announce();
  }
  override changeLetter(direction: -1 | 1): void {
    const current = this.letters[this.cursor] ?? 0;
    this.letters[this.cursor] =
      (current + direction + ALPHABET.length) % ALPHABET.length;
    this.announce();
  }
  override previousLetter(): void {
    this.cursor = Math.max(0, this.cursor - 1);
    this.announce();
  }
  override fire(): void {
    if (this.cursor < this.letters.length - 1) {
      this.cursor++;
      this.announce();
    } else {
      this.ctx.submitInitials(this.initials);
    }
  }

  private announce(): void {
    this.ctx.events.emit('initialsChanged', {
      initials: this.initials,
      cursor: this.cursor,
    });
  }
}
