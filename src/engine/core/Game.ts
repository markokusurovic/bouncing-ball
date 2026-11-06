import { gameConfig, type GameConfig } from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import { Paddle } from '../entities/Paddle';
import type { GameActions } from '../input/commands';
import {
  bounceOffWalls,
  circleRectSide,
  enforceMinVerticalAngle,
  paddleBounceVelocity,
} from '../physics/collision';
import { degToRad, upwardVelocity } from '../physics/vector';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { LoopTarget } from './GameLoop';
import type { InputSource, Renderer, Rng } from './interfaces';

export interface GameDependencies {
  readonly renderer: Renderer;
  readonly input: InputSource;
  readonly rng: Rng;
  readonly config?: GameConfig;
}

/** Composition root of the engine. Everything external is injected. */
export class Game implements LoopTarget, GameActions {
  readonly events = new EventBus<GameEvents>();
  readonly paddle: Paddle;
  readonly ball: Ball;
  private readonly renderer: Renderer;
  private readonly input: InputSource;
  private readonly rng: Rng;
  private readonly config: GameConfig;
  private paused = false;
  /** Length of the current update, used by commands. */
  private dt = 0;

  constructor({ renderer, input, rng, config = gameConfig }: GameDependencies) {
    this.renderer = renderer;
    this.input = input;
    this.rng = rng;
    this.config = config;
    const { paddle, ball, view } = config;
    this.paddle = new Paddle(paddle.width, paddle.height, paddle.y, view.width);
    this.ball = new Ball(ball.radius);
    this.ball.stickTo(this.paddle);
  }

  get isPaused(): boolean {
    return this.paused;
  }

  update(dt: number): void {
    this.dt = dt;
    for (const command of this.input.poll()) command.execute(this);
    if (this.paused) return;
    if (this.ball.stuck) this.ball.followPaddle(this.paddle);
    else this.moveBall(dt);
  }

  render(): void {
    const { renderer, paddle, ball } = this;
    renderer.clear('playfield');
    renderer.fillRect(
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height,
      'paddle',
    );
    const size = ball.radius * 2;
    renderer.fillRect(
      ball.x - ball.radius,
      ball.y - ball.radius,
      size,
      size,
      'ball',
    );
  }

  movePaddleBy(direction: -1 | 1): void {
    if (this.paused) return;
    this.paddle.moveBy(direction * this.config.paddle.speed * this.dt);
  }

  movePaddleTo(centerX: number): void {
    if (this.paused) return;
    this.paddle.moveTo(centerX);
  }

  fire(): void {
    if (this.paused || !this.ball.stuck) return;
    const spread = degToRad(this.config.ball.launchSpreadDegrees);
    const angle = (this.rng.next() * 2 - 1) * spread;
    this.ball.launch(upwardVelocity(angle, this.config.ball.speed));
    this.events.emit('ballLaunched', { x: this.ball.x });
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  /** Moves the ball in sub-steps no longer than `maxStep`, so it can't tunnel. */
  private moveBall(dt: number): void {
    const { ball, config } = this;
    const distance = Math.hypot(ball.vx, ball.vy) * dt;
    const steps = Math.max(1, Math.ceil(distance / config.ball.maxStep));
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;
      bounceOffWalls(ball, config.view.width);
      this.collideWithPaddle();
      if (ball.y - ball.radius > config.view.height) {
        this.events.emit('ballLost', { x: ball.x });
        ball.stickTo(this.paddle);
        return;
      }
    }
  }

  private collideWithPaddle(): void {
    const { ball, paddle, config } = this;
    const side = circleRectSide(ball, paddle);
    if (side === 'top' && ball.vy > 0) {
      const velocity = paddleBounceVelocity(
        ball.x,
        paddle,
        config.ball.speed,
        degToRad(config.bounce.maxAngleDegrees),
      );
      ball.vx = velocity.x;
      ball.vy = velocity.y;
      enforceMinVerticalAngle(
        ball,
        degToRad(config.bounce.minVerticalAngleDegrees),
      );
      ball.y = paddle.y - ball.radius;
      this.events.emit('paddleHit', { x: ball.x });
    } else if (side === 'left') {
      ball.x = paddle.x - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    } else if (side === 'right') {
      ball.x = paddle.x + paddle.width + ball.radius;
      ball.vx = Math.abs(ball.vx);
    }
  }
}
