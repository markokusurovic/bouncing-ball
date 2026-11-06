import { clamp, upwardVelocity, type Vec2 } from './vector';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface MovingCircle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly radius: number;
}

export type Side = 'left' | 'right' | 'top' | 'bottom';

/**
 * Returns the side of `rect` the circle overlaps (the side with the smallest
 * penetration), or null if they don't overlap. Ties prefer `top`.
 */
export function circleRectSide(circle: Circle, rect: Rect): Side | null {
  const dx = circle.x - clamp(circle.x, rect.x, rect.x + rect.width);
  const dy = circle.y - clamp(circle.y, rect.y, rect.y + rect.height);
  if (dx * dx + dy * dy >= circle.radius * circle.radius) return null;

  const top = circle.y + circle.radius - rect.y;
  const bottom = rect.y + rect.height - (circle.y - circle.radius);
  const left = circle.x + circle.radius - rect.x;
  const right = rect.x + rect.width - (circle.x - circle.radius);
  const min = Math.min(top, bottom, left, right);
  if (min === top) return 'top';
  if (min === bottom) return 'bottom';
  return min === left ? 'left' : 'right';
}

/**
 * Keeps the ball inside the left, right and top walls, reflecting its velocity.
 * The bottom is open. Returns true if a wall was hit.
 */
export function bounceOffWalls(
  ball: MovingCircle,
  fieldWidth: number,
): boolean {
  let hit = false;
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
    hit = true;
  } else if (ball.x + ball.radius > fieldWidth) {
    ball.x = fieldWidth - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    hit = true;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
    hit = true;
  }
  return hit;
}

/**
 * New velocity after hitting the paddle. The further from the center the ball
 * hits, the more it is tilted, up to `maxAngle` radians from vertical.
 */
export function paddleBounceVelocity(
  ballX: number,
  paddle: Rect,
  speed: number,
  maxAngle: number,
): Vec2 {
  const half = paddle.width / 2;
  const offset = clamp((ballX - (paddle.x + half)) / half, -1, 1);
  return upwardVelocity(offset * maxAngle, speed);
}

/**
 * Steepens the velocity if its angle to the horizontal is below `minAngle`
 * radians, keeping speed and direction signs. A purely horizontal velocity is
 * turned upwards.
 */
export function enforceMinVerticalAngle(
  velocity: { vx: number; vy: number },
  minAngle: number,
): void {
  const speed = Math.hypot(velocity.vx, velocity.vy);
  if (speed === 0) return;
  if (Math.atan2(Math.abs(velocity.vy), Math.abs(velocity.vx)) >= minAngle) {
    return;
  }
  const signX = velocity.vx < 0 ? -1 : 1;
  const signY = velocity.vy > 0 ? 1 : -1;
  velocity.vx = signX * speed * Math.cos(minAngle);
  velocity.vy = signY * speed * Math.sin(minAngle);
}
