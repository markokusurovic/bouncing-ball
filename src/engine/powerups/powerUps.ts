import type { GameConfig } from '../config/gameConfig';
import type { PowerUp, PowerUpTarget, PowerUpType } from './PowerUp';

export class WidePowerUp implements PowerUp {
  readonly type = 'wide';
  constructor(
    readonly duration: number,
    private readonly factor: number,
  ) {}
  apply(target: PowerUpTarget): void {
    target.setPaddleWidthFactor(this.factor);
  }
  remove(target: PowerUpTarget): void {
    target.setPaddleWidthFactor(1);
  }
}

export class SlowPowerUp implements PowerUp {
  readonly type = 'slow';
  constructor(
    readonly duration: number,
    private readonly factor: number,
  ) {}
  apply(target: PowerUpTarget): void {
    target.setSpeedFactor(this.factor);
  }
  remove(target: PowerUpTarget): void {
    target.setSpeedFactor(1);
  }
}

export class LaserPowerUp implements PowerUp {
  readonly type = 'laser';
  constructor(readonly duration: number) {}
  apply(target: PowerUpTarget): void {
    target.setLaser(true);
  }
  remove(target: PowerUpTarget): void {
    target.setLaser(false);
  }
}

/** Lasts until the extra balls are lost, so there is nothing to remove. */
export class MultiPowerUp implements PowerUp {
  readonly type = 'multi';
  readonly duration = null;
  apply(target: PowerUpTarget): void {
    target.splitBalls();
  }
  remove(): void {}
}

export function createPowerUps(
  config: GameConfig,
): Readonly<Record<PowerUpType, PowerUp>> {
  const p = config.powerUps;
  return {
    wide: new WidePowerUp(p.wideDuration, p.wideFactor),
    multi: new MultiPowerUp(),
    slow: new SlowPowerUp(p.slowDuration, p.slowFactor),
    laser: new LaserPowerUp(p.laserDuration),
  };
}
