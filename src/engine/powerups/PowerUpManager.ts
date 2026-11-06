import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { PowerUp, PowerUpTarget, PowerUpType } from './PowerUp';

/**
 * Runs timed power-ups. Collecting an active one again resets its timer;
 * different ones stack.
 */
export class PowerUpManager {
  /** Seconds left for each active timed power-up. */
  private readonly remaining = new Map<PowerUpType, number>();

  constructor(
    private readonly target: PowerUpTarget,
    private readonly powerUps: Readonly<Record<PowerUpType, PowerUp>>,
    private readonly events: EventBus<GameEvents>,
  ) {}

  activate(type: PowerUpType): void {
    const powerUp = this.powerUps[type];
    if (powerUp.duration === null || !this.remaining.has(type)) {
      powerUp.apply(this.target);
    }
    if (powerUp.duration !== null) this.remaining.set(type, powerUp.duration);
    this.events.emit('powerUpCollected', { type });
  }

  isActive(type: PowerUpType): boolean {
    return this.remaining.has(type);
  }

  timeLeft(type: PowerUpType): number {
    return this.remaining.get(type) ?? 0;
  }

  update(dt: number): void {
    for (const [type, left] of this.remaining) {
      if (left - dt > 0) this.remaining.set(type, left - dt);
      else this.deactivate(type);
    }
  }

  /** Removes every active power-up (on a lost life or a new level). */
  clear(): void {
    for (const type of this.remaining.keys()) this.deactivate(type);
  }

  private deactivate(type: PowerUpType): void {
    this.remaining.delete(type);
    this.powerUps[type].remove(this.target);
    this.events.emit('powerUpExpired', { type });
  }
}
