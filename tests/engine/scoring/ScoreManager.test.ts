import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../../src/engine/config/gameConfig';
import { EventBus } from '../../../src/engine/core/EventBus';
import type { GameEvents } from '../../../src/engine/core/events';
import { ScoreManager } from '../../../src/engine/scoring/ScoreManager';

function setup(extraLifeEvery = gameConfig.lives.extraLifeEvery) {
  const events = new EventBus<GameEvents>();
  const config = { ...gameConfig, lives: { start: 3, extraLifeEvery } };
  const score = new ScoreManager(events, config);
  const changes: string[] = [];
  let extraLives = 0;
  events.on('scoreChanged', ({ score: s, multiplier }) =>
    changes.push(`${s}x${multiplier}`),
  );
  events.on('extraLife', () => extraLives++);
  const destroy = (points = 100): void =>
    events.emit('brickDestroyed', { x: 0, y: 0, points, color: 'brick1' });
  return { events, score, changes, destroy, extraLives: () => extraLives };
}

describe('ScoreManager', () => {
  it('raises the combo multiplier per brick up to ×5', () => {
    const { score, destroy, changes } = setup();
    for (let i = 0; i < 6; i++) destroy();
    expect(changes).toEqual([
      '100x1',
      '300x2',
      '600x3',
      '1000x4',
      '1500x5',
      '2000x5',
    ]);
    expect(score.score).toBe(2000);
  });

  it('resets the combo on a paddle hit or a lost ball', () => {
    const { events, score, destroy } = setup();
    destroy();
    destroy();
    events.emit('paddleHit', { x: 0 });
    expect(score.multiplier).toBe(1);
    destroy();
    expect(score.score).toBe(400);
    destroy();
    events.emit('ballLost', { x: 0 });
    destroy();
    expect(score.score).toBe(400 + 200 + 100);
  });

  it('does not announce a combo reset when there was no combo', () => {
    const { events, changes } = setup();
    events.emit('paddleHit', { x: 0 });
    expect(changes).toEqual([]);
  });

  it('adds the level-clear bonus plus a bonus per remaining life', () => {
    const { events, score } = setup();
    events.emit('levelCleared', { level: 1, lives: 2 });
    expect(score.score).toBe(1000 + 2 * 500);
  });

  it('announces an extra life for every threshold crossed', () => {
    const { destroy, extraLives } = setup(250);
    destroy(); // 100
    expect(extraLives()).toBe(0);
    destroy(); // 300
    expect(extraLives()).toBe(1);
    destroy(1000); // 3300
    expect(extraLives()).toBe(13);
  });

  it('resets score, combo and thresholds', () => {
    const { score, destroy, changes, extraLives } = setup(250);
    destroy();
    destroy();
    score.reset();
    expect(score.score).toBe(0);
    expect(changes.at(-1)).toBe('0x1');
    destroy();
    destroy();
    expect(extraLives()).toBe(2);
  });
});
