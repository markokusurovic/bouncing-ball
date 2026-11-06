import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../../src/engine/config/gameConfig';
import { EventBus } from '../../../src/engine/core/EventBus';
import type { GameEvents } from '../../../src/engine/core/events';
import { ParticleSystem } from '../../../src/engine/entities/Particle';
import { FakeRenderer, fixedRng } from '../../fakes';

function setup(poolSize = gameConfig.particles.poolSize) {
  const events = new EventBus<GameEvents>();
  const config = {
    ...gameConfig,
    particles: { ...gameConfig.particles, poolSize },
  };
  const particles = new ParticleSystem(events, fixedRng(0.25), config);
  const active = () => particles.pool.items.filter((p) => p.active);
  const destroy = (): void =>
    events.emit('brickDestroyed', {
      x: 100,
      y: 50,
      points: 50,
      color: 'brick2',
    });
  return { particles, active, destroy };
}

describe('ParticleSystem', () => {
  it('bursts pooled particles from destroyed bricks', () => {
    const { active, destroy } = setup();
    destroy();
    expect(active()).toHaveLength(gameConfig.particles.perBrick);
    expect(active()[0]).toMatchObject({ x: 100, y: 50, color: 'brick2' });
  });

  it('stops when the pool is used up', () => {
    const { active, destroy } = setup(5);
    destroy();
    expect(active()).toHaveLength(5);
  });

  it('moves particles with gravity and retires them after their lifetime', () => {
    const { particles, active, destroy } = setup();
    destroy();
    const particle = active()[0];
    const vy = particle?.vy ?? 0;
    particles.update(0.1);
    expect(particle?.vy).toBeCloseTo(vy + gameConfig.particles.gravity * 0.1);
    particles.update(gameConfig.particles.lifetime);
    expect(active()).toHaveLength(0);
  });

  it('draws active particles and can be cleared', () => {
    const { particles, destroy } = setup();
    destroy();
    const renderer = new FakeRenderer();
    particles.render(renderer);
    expect(renderer.calls).toHaveLength(gameConfig.particles.perBrick);
    expect(renderer.calls[0]).toMatchObject({
      op: 'rect',
      w: 2,
      h: 2,
      color: 'brick2',
    });
    particles.clear();
    const after = new FakeRenderer();
    particles.render(after);
    expect(after.calls).toEqual([]);
  });
});
