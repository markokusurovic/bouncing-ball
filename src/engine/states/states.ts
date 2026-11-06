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

/** Fire returns to the menu after a short delay. */
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
    if (this.timeLeft <= 0) this.ctx.setState('menu');
  }
}
