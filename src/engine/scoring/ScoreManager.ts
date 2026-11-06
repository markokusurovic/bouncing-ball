import type { GameConfig } from '../config/gameConfig';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';

/**
 * Observer: listens to game events and keeps score. Consecutive bricks
 * without touching the paddle raise a combo multiplier (×1 → max).
 */
export class ScoreManager {
  private total = 0;
  /** Bricks destroyed since the paddle was last touched. */
  private combo = 0;
  private nextExtraLife: number;

  constructor(
    private readonly events: EventBus<GameEvents>,
    private readonly config: GameConfig,
  ) {
    this.nextExtraLife = config.lives.extraLifeEvery;
    events.on('brickDestroyed', ({ points }) => {
      this.combo++;
      this.add(points * this.multiplier);
    });
    events.on('paddleHit', () => this.resetCombo());
    events.on('ballLost', () => this.resetCombo());
    events.on('levelCleared', ({ lives }) => {
      this.combo = 0;
      const { levelClearBonus, bonusPerLife } = config.scoring;
      this.add(levelClearBonus + bonusPerLife * lives);
    });
  }

  get score(): number {
    return this.total;
  }

  /** Multiplier of the last scored brick (×1 when no combo is running). */
  get multiplier(): number {
    return Math.min(
      Math.max(this.combo, 1),
      this.config.scoring.maxComboMultiplier,
    );
  }

  reset(): void {
    this.total = 0;
    this.combo = 0;
    this.nextExtraLife = this.config.lives.extraLifeEvery;
    this.announce();
  }

  private resetCombo(): void {
    if (this.combo === 0) return;
    this.combo = 0;
    this.announce();
  }

  private add(points: number): void {
    this.total += points;
    this.announce();
    while (this.total >= this.nextExtraLife) {
      this.nextExtraLife += this.config.lives.extraLifeEvery;
      this.events.emit('extraLife', { score: this.total });
    }
  }

  private announce(): void {
    this.events.emit('scoreChanged', {
      score: this.total,
      multiplier: this.multiplier,
    });
  }
}
