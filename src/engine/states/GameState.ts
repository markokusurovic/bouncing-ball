import type { ParticleSystem } from '../entities/Particle';
import type { Playfield } from '../core/Playfield';

export type StateName =
  'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver';

/** What states may do to the game. Implemented by `Game`. */
export interface StateContext {
  readonly playfield: Playfield;
  readonly particles: ParticleSystem;
  readonly state: StateName;
  newGame(): void;
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
}
