import { describe, expect, it } from 'vitest';
import { Ball } from '../../../src/engine/entities/Ball';
import { Paddle } from '../../../src/engine/entities/Paddle';

describe('Paddle', () => {
  it('resizes around its center and stays inside the field', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    paddle.resize(60);
    expect(paddle).toMatchObject({ x: 130, width: 60 });
    paddle.moveTo(0);
    paddle.resize(40);
    expect(paddle.x).toBe(10);
    paddle.moveTo(320);
    paddle.resize(80);
    expect(paddle.x).toBe(240);
  });

  it('starts centered', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    expect(paddle.x).toBe(140);
    expect(paddle.centerX).toBe(160);
  });

  it('moves by an amount and stays between the walls', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    paddle.moveBy(-10);
    expect(paddle.x).toBe(130);
    paddle.moveBy(-1000);
    expect(paddle.x).toBe(0);
    paddle.moveBy(1000);
    expect(paddle.x).toBe(280);
  });

  it('moves its center to a point, clamped to the walls', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    paddle.moveTo(100);
    expect(paddle.centerX).toBe(100);
    paddle.moveTo(5);
    expect(paddle.x).toBe(0);
    paddle.moveTo(400);
    expect(paddle.x).toBe(280);
  });
});

describe('Ball', () => {
  it('sticks on top of the paddle center with no velocity', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    const ball = new Ball(3);
    ball.launch({ x: 10, y: -10 });
    ball.stickTo(paddle);
    expect(ball).toMatchObject({ x: 160, y: 219, vx: 0, vy: 0, stuck: true });
  });

  it('follows the paddle and launches with the given velocity', () => {
    const paddle = new Paddle(40, 6, 222, 320);
    const ball = new Ball(3);
    paddle.moveTo(50);
    ball.followPaddle(paddle);
    expect(ball.x).toBe(50);
    ball.launch({ x: 1, y: -2 });
    expect(ball).toMatchObject({ vx: 1, vy: -2, stuck: false });
  });
});
