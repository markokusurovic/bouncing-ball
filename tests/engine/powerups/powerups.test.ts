import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../../src/engine/config/gameConfig';
import { EventBus } from '../../../src/engine/core/EventBus';
import type { GameEvents } from '../../../src/engine/core/events';
import { Pool } from '../../../src/engine/core/Pool';
import type { PowerUpTarget } from '../../../src/engine/powerups/PowerUp';
import { PowerUpManager } from '../../../src/engine/powerups/PowerUpManager';
import { createPowerUps } from '../../../src/engine/powerups/powerUps';

class RecordingTarget implements PowerUpTarget {
  calls: string[] = [];
  setPaddleWidthFactor(factor: number): void {
    this.calls.push(`width ${factor}`);
  }
  setSpeedFactor(factor: number): void {
    this.calls.push(`speed ${factor}`);
  }
  splitBalls(): void {
    this.calls.push('split');
  }
  setLaser(enabled: boolean): void {
    this.calls.push(`laser ${enabled}`);
  }
}

function setup() {
  const target = new RecordingTarget();
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  events.on('powerUpCollected', ({ type }) => log.push(`+${type}`));
  events.on('powerUpExpired', ({ type }) => log.push(`-${type}`));
  const manager = new PowerUpManager(
    target,
    createPowerUps(gameConfig),
    events,
  );
  return { target, manager, log };
}

describe('PowerUpManager', () => {
  it('applies each strategy and removes it when its time runs out', () => {
    const { target, manager, log } = setup();
    manager.activate('wide');
    manager.activate('slow');
    manager.activate('laser');
    expect(target.calls).toEqual(['width 1.5', 'speed 0.6', 'laser true']);
    expect(manager.isActive('slow')).toBe(true);

    manager.update(10);
    expect(target.calls.slice(3)).toEqual(['speed 1']);
    expect(manager.isActive('slow')).toBe(false);
    expect(manager.timeLeft('wide')).toBeCloseTo(5);

    manager.update(5);
    expect(target.calls.slice(4)).toEqual(['width 1', 'laser false']);
    expect(log).toEqual([
      '+wide',
      '+slow',
      '+laser',
      '-slow',
      '-wide',
      '-laser',
    ]);
  });

  it('resets the timer when the same power-up is collected again', () => {
    const { target, manager } = setup();
    manager.activate('wide');
    manager.update(14);
    manager.activate('wide');
    expect(target.calls).toEqual(['width 1.5']);
    manager.update(14);
    expect(manager.isActive('wide')).toBe(true);
    expect(manager.timeLeft('wide')).toBeCloseTo(1);
  });

  it('splits balls on every Multi and never times it out', () => {
    const { target, manager } = setup();
    manager.activate('multi');
    manager.activate('multi');
    manager.update(100);
    expect(target.calls).toEqual(['split', 'split']);
    expect(manager.isActive('multi')).toBe(false);
  });

  it('removes everything on clear', () => {
    const { target, manager } = setup();
    manager.activate('wide');
    manager.activate('laser');
    manager.clear();
    expect(target.calls.slice(2)).toEqual(['width 1', 'laser false']);
    expect(manager.timeLeft('wide')).toBe(0);
  });
});

describe('Pool', () => {
  it('reuses a fixed set of objects', () => {
    const pool = new Pool(2, () => ({ active: false }));
    const a = pool.acquire();
    const b = pool.acquire();
    expect(a).not.toBe(b);
    expect(pool.acquire()).toBeNull();
    if (a) a.active = false;
    expect(pool.acquire()).toBe(a);
    pool.releaseAll();
    expect(pool.items.every((item) => !item.active)).toBe(true);
  });
});
