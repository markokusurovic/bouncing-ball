import type { GameConfig } from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import type { Brick } from '../entities/Brick';
import { Paddle } from '../entities/Paddle';
import {
  bounceOffWalls,
  circleRectSide,
  enforceMinVerticalAngle,
  paddleBounceVelocity,
} from '../physics/collision';
import { degToRad, upwardVelocity } from '../physics/vector';
import type { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { Renderer, Rng } from './interfaces';

/**
 * The physical world of one level: paddle, balls and bricks. It moves things,
 * resolves collisions and announces what happened on the event bus.
 */
export class Playfield {
  readonly paddle: Paddle;
  readonly balls: Ball[] = [];
  bricks: readonly Brick[] = [];
  /** Current ball speed in px/s. */
  speed: number;

  constructor(
    private readonly events: EventBus<GameEvents>,
    private readonly rng: Rng,
    private readonly config: GameConfig,
  ) {
    const { paddle, view } = config;
    this.paddle = new Paddle(paddle.width, paddle.height, paddle.y, view.width);
    this.speed = config.ball.speed;
    this.resetBalls();
  }

  /** Sets up a level: its bricks, ball speed and one ball on the paddle. */
  start(bricks: readonly Brick[], speed: number): void {
    this.bricks = bricks;
    this.speed = speed;
    this.resetBalls();
  }

  /** True when every breakable brick is gone. */
  get cleared(): boolean {
    return !this.bricks.some((brick) => brick.breakable && !brick.destroyed);
  }

  resetBalls(): void {
    this.balls.length = 0;
    const ball = new Ball(this.config.ball.radius);
    ball.stickTo(this.paddle);
    this.balls.push(ball);
  }

  movePaddleBy(dx: number): void {
    this.paddle.moveBy(dx);
  }

  movePaddleTo(centerX: number): void {
    this.paddle.moveTo(centerX);
  }

  /** Launches every ball waiting on the paddle. Returns true if one launched. */
  launch(): boolean {
    let launched = false;
    for (const ball of this.balls) {
      if (!ball.stuck) continue;
      const spread = degToRad(this.config.ball.launchSpreadDegrees);
      const angle = (this.rng.next() * 2 - 1) * spread;
      ball.launch(upwardVelocity(angle, this.speed));
      this.events.emit('ballLaunched', { x: ball.x });
      launched = true;
    }
    return launched;
  }

  update(dt: number): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball) continue;
      if (ball.stuck) ball.followPaddle(this.paddle);
      else if (!this.moveBall(ball, dt)) this.balls.splice(i, 1);
    }
    if (this.balls.length === 0) {
      this.resetBalls();
      this.events.emit('ballLost', { x: this.paddle.centerX });
    }
  }

  render(renderer: Renderer): void {
    renderer.clear('playfield');
    for (const brick of this.bricks) {
      if (brick.destroyed) continue;
      // One pixel less on each axis leaves a visible gap between bricks.
      renderer.fillRect(
        brick.x,
        brick.y,
        brick.width - 1,
        brick.height - 1,
        brick.color,
      );
    }
    const { paddle } = this;
    renderer.fillRect(
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height,
      'paddle',
    );
    for (const ball of this.balls) {
      const size = ball.radius * 2;
      renderer.fillRect(
        ball.x - ball.radius,
        ball.y - ball.radius,
        size,
        size,
        'ball',
      );
    }
  }

  /**
   * Moves a ball in sub-steps no longer than `maxStep`, so it can't tunnel.
   * Returns false if the ball fell out of the playfield.
   */
  private moveBall(ball: Ball, dt: number): boolean {
    const { view } = this.config;
    const distance = Math.hypot(ball.vx, ball.vy) * dt;
    const steps = Math.max(1, Math.ceil(distance / this.config.ball.maxStep));
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.x += ball.vx * stepDt;
      ball.y += ball.vy * stepDt;
      bounceOffWalls(ball, view.width, view.hudHeight);
      this.collideWithPaddle(ball);
      this.collideWithBricks(ball);
      if (ball.y - ball.radius > view.height) return false;
    }
    return true;
  }

  private collideWithPaddle(ball: Ball): void {
    const { paddle, config } = this;
    const side = circleRectSide(ball, paddle);
    if (side === 'top' && ball.vy > 0) {
      const velocity = paddleBounceVelocity(
        ball.x,
        paddle,
        this.speed,
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

  /**
   * Hits every brick the ball overlaps while moving into it, then reflects
   * the ball at most once per axis. Checking the direction keeps a ball that
   * already bounced from hitting the same brick again, and lets it break two
   * neighbours at a seam without bouncing twice.
   */
  private collideWithBricks(ball: Ball): void {
    let flipX = false;
    let flipY = false;
    for (const brick of this.bricks) {
      if (brick.destroyed) continue;
      const side = circleRectSide(ball, brick);
      if (side === null) continue;
      if (
        (side === 'top' && ball.vy > 0) ||
        (side === 'bottom' && ball.vy < 0)
      ) {
        flipY = true;
      } else if (
        (side === 'left' && ball.vx > 0) ||
        (side === 'right' && ball.vx < 0)
      ) {
        flipX = true;
      } else {
        continue;
      }
      this.hitBrick(brick);
    }
    if (flipX) ball.vx = -ball.vx;
    if (flipY) ball.vy = -ball.vy;
  }

  private hitBrick(brick: Brick): void {
    const x = brick.centerX;
    const y = brick.centerY;
    if (brick.hit()) {
      this.events.emit('brickDestroyed', {
        x,
        y,
        points: brick.points,
        color: brick.color,
      });
    } else {
      this.events.emit('brickHit', { x, y });
    }
  }
}
