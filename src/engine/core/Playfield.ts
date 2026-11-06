import type { GameConfig } from '../config/gameConfig';
import { Ball } from '../entities/Ball';
import type { Brick } from '../entities/Brick';
import { Bullet } from '../entities/Bullet';
import { Paddle } from '../entities/Paddle';
import { PowerUpCapsule } from '../entities/PowerUpCapsule';
import {
  bounceOffWalls,
  circleRectSide,
  enforceMinVerticalAngle,
  paddleBounceVelocity,
  rectsOverlap,
} from '../physics/collision';
import { degToRad, upwardVelocity } from '../physics/vector';
import {
  POWER_UP_TYPES,
  type PowerUpTarget,
  type PowerUpType,
} from '../powerups/PowerUp';
import { PowerUpManager } from '../powerups/PowerUpManager';
import { createPowerUps } from '../powerups/powerUps';
import type { PaletteKey } from '../../theme/palette';
import type { EventBus } from './EventBus';
import type { GameEvents } from './events';
import type { Renderer, Rng } from './interfaces';
import { Pool } from './Pool';

const CAPSULE_COLORS: Readonly<Record<PowerUpType, PaletteKey>> = {
  wide: 'powerWide',
  multi: 'powerMulti',
  slow: 'powerSlow',
  laser: 'powerLaser',
};

/**
 * The physical world of one level: paddle, balls, bricks, capsules and laser
 * bullets. It moves things, resolves collisions and announces what happened
 * on the event bus. It is also the target power-ups act on.
 */
export class Playfield implements PowerUpTarget {
  readonly paddle: Paddle;
  readonly balls: Ball[] = [];
  bricks: readonly Brick[] = [];
  /** Ball speed of the level in px/s, before power-ups. */
  speed: number;
  readonly powerUps: PowerUpManager;
  readonly capsules: Pool<PowerUpCapsule>;
  readonly bullets: Pool<Bullet>;
  private speedFactor = 1;
  private laser = false;
  private laserCooldown = 0;

  constructor(
    private readonly events: EventBus<GameEvents>,
    private readonly rng: Rng,
    private readonly config: GameConfig,
  ) {
    const { paddle, view } = config;
    this.paddle = new Paddle(paddle.width, paddle.height, paddle.y, view.width);
    this.speed = config.ball.speed;
    const p = config.powerUps;
    this.powerUps = new PowerUpManager(this, createPowerUps(config), events);
    this.capsules = new Pool(
      p.maxCapsules,
      () => new PowerUpCapsule(p.capsuleWidth, p.capsuleHeight),
    );
    this.bullets = new Pool(
      p.maxBullets,
      () => new Bullet(p.bulletWidth, p.bulletHeight),
    );
    this.resetBalls();
  }

  /** Sets up a level: its bricks, ball speed and one ball on the paddle. */
  start(bricks: readonly Brick[], speed: number): void {
    this.bricks = bricks;
    this.speed = speed;
    this.resetRound();
  }

  /** Current ball speed including power-ups. */
  get ballSpeed(): number {
    return this.speed * this.speedFactor;
  }

  get laserEnabled(): boolean {
    return this.laser;
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

  /** Ends power-ups and removes capsules, bullets and extra balls. */
  resetRound(): void {
    this.powerUps.clear();
    this.capsules.releaseAll();
    this.bullets.releaseAll();
    this.laserCooldown = 0;
    this.resetBalls();
  }

  setPaddleWidthFactor(factor: number): void {
    this.paddle.resize(this.config.paddle.width * factor);
  }

  setSpeedFactor(factor: number): void {
    this.speedFactor = factor;
    for (const ball of this.balls) {
      const current = Math.hypot(ball.vx, ball.vy);
      if (current === 0) continue;
      const scale = this.ballSpeed / current;
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }

  /** Splits the first ball into `multiBallCount`, fanned out by the spread. */
  splitBalls(): void {
    const { multiBallCount, multiMaxBalls, multiSpreadDegrees } =
      this.config.powerUps;
    const source = this.balls[0];
    if (!source) return;
    const angle = Math.atan2(source.vx, -source.vy);
    const spread = degToRad(multiSpreadDegrees);
    for (let i = 1; i < multiBallCount; i++) {
      if (this.balls.length >= multiMaxBalls) return;
      const ball = new Ball(source.radius);
      ball.x = source.x;
      ball.y = source.y;
      if (!source.stuck) {
        const side = i % 2 === 1 ? 1 : -1;
        const offset = side * spread * Math.ceil(i / 2);
        ball.launch(upwardVelocity(angle + offset, this.ballSpeed));
        if (source.vy > 0) ball.vy = Math.abs(ball.vy);
      }
      this.balls.push(ball);
    }
  }

  setLaser(enabled: boolean): void {
    this.laser = enabled;
  }

  /** Launches waiting balls, or else fires the laser if it is ready. */
  fire(): void {
    if (this.launch() || !this.laser || this.laserCooldown > 0) return;
    const bullet = this.bullets.acquire();
    if (!bullet) return;
    bullet.fire(this.paddle.centerX, this.paddle.y);
    this.laserCooldown = this.config.powerUps.laserCooldown;
    this.events.emit('laserFired', { x: this.paddle.centerX });
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
      ball.launch(upwardVelocity(angle, this.ballSpeed));
      this.events.emit('ballLaunched', { x: ball.x });
      launched = true;
    }
    return launched;
  }

  update(dt: number): void {
    this.powerUps.update(dt);
    this.laserCooldown = Math.max(0, this.laserCooldown - dt);
    this.moveBullets(dt);
    this.moveCapsules(dt);
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball) continue;
      if (ball.stuck) ball.followPaddle(this.paddle);
      else if (!this.moveBall(ball, dt)) this.balls.splice(i, 1);
    }
    if (this.balls.length === 0) {
      this.resetRound();
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
    for (const capsule of this.capsules.items) {
      if (!capsule.active) continue;
      renderer.fillRect(
        capsule.x,
        capsule.y,
        capsule.width,
        capsule.height,
        CAPSULE_COLORS[capsule.type],
      );
    }
    for (const bullet of this.bullets.items) {
      if (!bullet.active) continue;
      renderer.fillRect(
        bullet.x,
        bullet.y,
        bullet.width,
        bullet.height,
        'bullet',
      );
    }
    const { paddle } = this;
    renderer.fillRect(
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height,
      this.laser ? 'paddleLaser' : 'paddle',
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
        this.ballSpeed,
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

  /** Moves laser bullets; each one stops at the first brick it touches. */
  private moveBullets(dt: number): void {
    const distance = this.config.powerUps.bulletSpeed * dt;
    for (const bullet of this.bullets.items) {
      if (!bullet.active) continue;
      bullet.y -= distance;
      const target = this.bricks.find(
        (brick) => !brick.destroyed && rectsOverlap(bullet, brick),
      );
      if (target) this.hitBrick(target);
      if (target || bullet.y + bullet.height < this.config.view.hudHeight) {
        bullet.active = false;
      }
    }
  }

  private moveCapsules(dt: number): void {
    const distance = this.config.powerUps.capsuleSpeed * dt;
    for (const capsule of this.capsules.items) {
      if (!capsule.active) continue;
      capsule.y += distance;
      if (rectsOverlap(capsule, this.paddle)) {
        capsule.active = false;
        this.powerUps.activate(capsule.type);
      } else if (capsule.y > this.config.view.height) {
        capsule.active = false;
      }
    }
  }

  /** Maybe drops a random power-up capsule from a destroyed brick. */
  private maybeDropCapsule(brick: Brick): void {
    if (this.rng.next() >= this.config.powerUps.dropChance) return;
    const index = Math.floor(this.rng.next() * POWER_UP_TYPES.length);
    const type = POWER_UP_TYPES[index] ?? 'wide';
    this.capsules.acquire()?.drop(type, brick.centerX, brick.centerY);
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
      this.maybeDropCapsule(brick);
    } else {
      this.events.emit('brickHit', { x, y });
    }
  }
}
