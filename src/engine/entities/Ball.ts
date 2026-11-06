import type { MovingCircle } from '../physics/collision';
import type { Vec2 } from '../physics/vector';
import type { Paddle } from './Paddle';

export class Ball implements MovingCircle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** While stuck, the ball rides on the paddle and waits to be launched. */
  stuck = true;

  constructor(readonly radius: number) {}

  stickTo(paddle: Paddle): void {
    this.stuck = true;
    this.vx = 0;
    this.vy = 0;
    this.followPaddle(paddle);
  }

  followPaddle(paddle: Paddle): void {
    this.x = paddle.centerX;
    this.y = paddle.y - this.radius;
  }

  launch(velocity: Vec2): void {
    this.stuck = false;
    this.vx = velocity.x;
    this.vy = velocity.y;
  }
}
