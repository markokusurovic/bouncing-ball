import type { ParticleSystem } from '../entities/Particle';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { Playfield } from '../core/Playfield';

export type StateName =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'levelComplete'
  | 'gameOver'
  | 'highScoreEntry';

/** What states may do to the game. Implemented by `Game`. */
export interface StateContext {
  readonly playfield: Playfield;
  readonly particles: ParticleSystem;
  readonly state: StateName;
  readonly events: EventBus<GameEvents>;
  newGame(): void;
  /** Leaves the game-over screen: to initials entry or to the menu. */
  leaveGameOver(): void;
  submitInitials(initials: string): void;
  nextLevel(): void;
  completeLevel(): void;
  setState(name: StateName): void;
}

/**
 * State pattern: one game screen. The game forwards updates and commands to
 * the current state, which decides what they mean on that screen.
 */
export interface GameState {
  readonly name: StateName;
  enter(): void;
  update(dt: number): void;
  fire(): void;
  togglePause(): void;
  movePaddleBy(dx: number): void;
  movePaddleTo(centerX: number): void;
  changeLetter(direction: -1 | 1): void;
  previousLetter(): void;
}

/** Ignores everything; states override only what they handle. */
export abstract class BaseState implements GameState {
  abstract readonly name: StateName;
  constructor(protected readonly ctx: StateContext) {}
  enter(): void {}
  update(dt: number): void {
    this.ctx.particles.update(dt);
  }
  fire(): void {}
  togglePause(): void {}
  movePaddleBy(_dx: number): void {}
  movePaddleTo(_centerX: number): void {}
  changeLetter(_direction: -1 | 1): void {}
  previousLetter(): void {}
}
