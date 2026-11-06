import { describe, expect, it } from 'vitest';
import {
  bounceOffWalls,
  circleRectSide,
  enforceMinVerticalAngle,
  paddleBounceVelocity,
  type MovingCircle,
} from '../../../src/engine/physics/collision';
import { degToRad } from '../../../src/engine/physics/vector';

const rect = { x: 100, y: 100, width: 40, height: 10 };

function ball(x: number, y: number, vx = 0, vy = 0): MovingCircle {
  return { x, y, vx, vy, radius: 3 };
}

const angleFromHorizontal = (v: { vx: number; vy: number }): number =>
  Math.atan2(Math.abs(v.vy), Math.abs(v.vx));

describe('circleRectSide', () => {
  it('returns null when apart', () => {
    expect(circleRectSide({ x: 120, y: 90, radius: 3 }, rect)).toBeNull();
  });

  it('returns null near a corner but outside the radius', () => {
    expect(circleRectSide({ x: 98, y: 98, radius: 2.5 }, rect)).toBeNull();
  });

  it('detects each side by smallest penetration', () => {
    expect(circleRectSide({ x: 120, y: 98, radius: 3 }, rect)).toBe('top');
    expect(circleRectSide({ x: 120, y: 112, radius: 3 }, rect)).toBe('bottom');
    expect(circleRectSide({ x: 98, y: 105, radius: 3 }, rect)).toBe('left');
    expect(circleRectSide({ x: 142, y: 105, radius: 3 }, rect)).toBe('right');
  });
});

describe('bounceOffWalls', () => {
  it('reflects off the left wall and pushes the ball inside', () => {
    const b = ball(1, 50, -10, 5);
    expect(bounceOffWalls(b, 320)).toBe(true);
    expect(b).toMatchObject({ x: 3, vx: 10, vy: 5 });
  });

  it('reflects off the right wall', () => {
    const b = ball(319, 50, 10, 5);
    expect(bounceOffWalls(b, 320)).toBe(true);
    expect(b).toMatchObject({ x: 317, vx: -10 });
  });

  it('reflects off the ceiling', () => {
    const b = ball(50, 1, 5, -10);
    expect(bounceOffWalls(b, 320)).toBe(true);
    expect(b).toMatchObject({ y: 3, vy: 10 });
  });

  it('handles a corner hit in one call', () => {
    const b = ball(1, 1, -10, -10);
    bounceOffWalls(b, 320);
    expect(b).toMatchObject({ vx: 10, vy: 10 });
  });

  it('leaves the bottom open and ignores balls inside', () => {
    const b = ball(50, 500, 5, 10);
    expect(bounceOffWalls(b, 320)).toBe(false);
    expect(b).toMatchObject({ x: 50, y: 500, vx: 5, vy: 10 });
  });
});

describe('paddleBounceVelocity', () => {
  const paddle = { x: 100, y: 200, width: 40, height: 6 };
  const max = degToRad(60);

  it('sends the ball straight up from the center', () => {
    const v = paddleBounceVelocity(120, paddle, 150, max);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(-150);
  });

  it('tilts towards the side that was hit, up to the max angle', () => {
    const right = paddleBounceVelocity(140, paddle, 150, max);
    expect(Math.atan2(right.x, -right.y)).toBeCloseTo(max);
    const left = paddleBounceVelocity(110, paddle, 150, max);
    expect(Math.atan2(left.x, -left.y)).toBeCloseTo(-max / 2);
  });

  it('clamps hits beyond the edge and keeps the speed', () => {
    const v = paddleBounceVelocity(500, paddle, 150, max);
    expect(Math.atan2(v.x, -v.y)).toBeCloseTo(max);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(150);
  });
});

describe('enforceMinVerticalAngle', () => {
  const min = degToRad(20);

  it('steepens a shallow path, keeping speed and direction', () => {
    const v = { vx: -100, vy: 5 };
    enforceMinVerticalAngle(v, min);
    expect(angleFromHorizontal(v)).toBeCloseTo(min);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(Math.hypot(100, 5));
    expect(v.vx).toBeLessThan(0);
    expect(v.vy).toBeGreaterThan(0);
  });

  it('turns a horizontal path upwards', () => {
    const v = { vx: 100, vy: 0 };
    enforceMinVerticalAngle(v, min);
    expect(v.vy).toBeLessThan(0);
    expect(angleFromHorizontal(v)).toBeCloseTo(min);
  });

  it('leaves steep and zero velocities alone', () => {
    const steep = { vx: 10, vy: -100 };
    enforceMinVerticalAngle(steep, min);
    expect(steep).toEqual({ vx: 10, vy: -100 });
    const zero = { vx: 0, vy: 0 };
    enforceMinVerticalAngle(zero, min);
    expect(zero).toEqual({ vx: 0, vy: 0 });
  });
});
