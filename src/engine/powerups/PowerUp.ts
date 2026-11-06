export type PowerUpType = 'wide' | 'multi' | 'slow' | 'laser';

export const POWER_UP_TYPES: readonly PowerUpType[] = [
  'wide',
  'multi',
  'slow',
  'laser',
];

/** What a power-up may change. The playfield implements it. */
export interface PowerUpTarget {
  /** Paddle width as a multiple of its normal width. */
  setPaddleWidthFactor(factor: number): void;
  /** Ball speed as a multiple of the level speed. */
  setSpeedFactor(factor: number): void;
  splitBalls(): void;
  setLaser(enabled: boolean): void;
}

/** Strategy: one power-up's effect. */
export interface PowerUp {
  readonly type: PowerUpType;
  /** Seconds the effect lasts, or null if it is one-shot (Multi). */
  readonly duration: number | null;
  apply(target: PowerUpTarget): void;
  remove(target: PowerUpTarget): void;
}
