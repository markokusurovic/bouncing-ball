import type { GameConfig } from '../config/gameConfig';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { Renderer, Rng } from '../core/interfaces';
import { Pool, type Poolable } from '../core/Pool';
import type { PaletteKey } from '../../theme/palette';

export class Particle implements Poolable {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Seconds left before it disappears. */
  life = 0;
  color: PaletteKey = 'light';
}

/** Observer: bursts pooled particles out of every destroyed brick. */
export class ParticleSystem {
  readonly pool: Pool<Particle>;

  constructor(
    events: EventBus<GameEvents>,
    private readonly rng: Rng,
    private readonly config: GameConfig,
  ) {
    this.pool = new Pool(config.particles.poolSize, () => new Particle());
    events.on('brickDestroyed', ({ x, y, color }) => this.burst(x, y, color));
  }

  burst(x: number, y: number, color: PaletteKey): void {
    const p = this.config.particles;
    for (let i = 0; i < p.perBrick; i++) {
      const particle = this.pool.acquire();
      if (!particle) return;
      const angle = this.rng.next() * Math.PI * 2;
      const speed = p.minSpeed + this.rng.next() * (p.maxSpeed - p.minSpeed);
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = p.lifetime;
      particle.color = color;
    }
  }

  update(dt: number): void {
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.vy += this.config.particles.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
  }

  render(renderer: Renderer): void {
    const { size } = this.config.particles;
    for (const particle of this.pool.items) {
      if (particle.active) {
        renderer.fillRect(particle.x, particle.y, size, size, particle.color);
      }
    }
  }

  clear(): void {
    this.pool.releaseAll();
  }
}
