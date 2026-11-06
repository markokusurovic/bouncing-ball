/**
 * All tunable numbers of the game. Never hard-code these in logic.
 * Distances are in internal view pixels, times in seconds, angles in degrees.
 */
export interface GameConfig {
  readonly view: {
    readonly width: number;
    readonly height: number;
    /** Strip at the top kept free for the HUD; the ceiling sits below it. */
    readonly hudHeight: number;
  };
  readonly loop: {
    /** Fixed number of physics updates per second. */
    readonly updatesPerSecond: number;
    /** Longest frame time processed at once; protects against a spiral of death. */
    readonly maxFrameSeconds: number;
  };
  readonly paddle: {
    readonly width: number;
    readonly height: number;
    /** Top edge of the paddle. */
    readonly y: number;
    /** Keyboard movement speed in px/s. */
    readonly speed: number;
  };
  readonly ball: {
    readonly radius: number;
    /** Speed in px/s on level 1. */
    readonly speed: number;
    /** Longest distance moved in one collision sub-step (≤ radius / 2). */
    readonly maxStep: number;
    /** Launch direction is randomly tilted by up to this angle from vertical. */
    readonly launchSpreadDegrees: number;
  };
  readonly bounce: {
    /** Angle from vertical when the ball hits the very edge of the paddle. */
    readonly maxAngleDegrees: number;
    /** Smallest allowed angle between the ball's path and the horizontal. */
    readonly minVerticalAngleDegrees: number;
  };
  readonly bricks: {
    /** Number of characters in every level row. */
    readonly columns: number;
    readonly width: number;
    readonly height: number;
    /** Position of the top-left brick. */
    readonly left: number;
    readonly top: number;
    /** Points for normal bricks `1`–`4`. */
    readonly normalPoints: readonly [number, number, number, number];
    readonly silverPoints: number;
    readonly silverBaseHits: number;
    readonly silverMaxHits: number;
    /** Silver bricks need one more hit every this many levels. */
    readonly silverLevelsPerExtraHit: number;
  };
  readonly lives: {
    readonly start: number;
    readonly extraLifeEvery: number;
  };
  readonly scoring: {
    readonly maxComboMultiplier: number;
    readonly levelClearBonus: number;
    readonly bonusPerLife: number;
  };
  readonly powerUps: {
    /** Chance that a destroyed brick drops a capsule (0–1). */
    readonly dropChance: number;
    readonly capsuleWidth: number;
    readonly capsuleHeight: number;
    /** Falling speed of capsules in px/s. */
    readonly capsuleSpeed: number;
    readonly maxCapsules: number;
    readonly wideFactor: number;
    readonly wideDuration: number;
    readonly slowFactor: number;
    readonly slowDuration: number;
    /** Multi splits a ball into this many. */
    readonly multiBallCount: number;
    readonly multiMaxBalls: number;
    /** Angle between the split balls. */
    readonly multiSpreadDegrees: number;
    readonly laserDuration: number;
    /** Shortest time between two laser shots. */
    readonly laserCooldown: number;
    readonly bulletSpeed: number;
    readonly bulletWidth: number;
    readonly bulletHeight: number;
    readonly maxBullets: number;
  };
  readonly levels: {
    /** Ball speed grows by this fraction per level within a loop. */
    readonly speedIncreasePerLevel: number;
    /** And by this fraction for every completed loop of all levels. */
    readonly speedIncreasePerLoop: number;
  };
}

export const gameConfig: GameConfig = {
  view: { width: 320, height: 240, hudHeight: 16 },
  loop: { updatesPerSecond: 120, maxFrameSeconds: 0.25 },
  paddle: { width: 40, height: 6, y: 222, speed: 240 },
  ball: { radius: 3, speed: 150, maxStep: 1.5, launchSpreadDegrees: 15 },
  bounce: { maxAngleDegrees: 60, minVerticalAngleDegrees: 20 },
  bricks: {
    columns: 13,
    width: 24,
    height: 8,
    left: 4,
    top: 32,
    normalPoints: [50, 60, 70, 80],
    silverPoints: 200,
    silverBaseHits: 2,
    silverMaxHits: 3,
    silverLevelsPerExtraHit: 5,
  },
  lives: { start: 3, extraLifeEvery: 10_000 },
  scoring: { maxComboMultiplier: 5, levelClearBonus: 1000, bonusPerLife: 500 },
  powerUps: {
    dropChance: 0.15,
    capsuleWidth: 16,
    capsuleHeight: 7,
    capsuleSpeed: 50,
    maxCapsules: 6,
    wideFactor: 1.5,
    wideDuration: 15,
    slowFactor: 0.6,
    slowDuration: 10,
    multiBallCount: 3,
    multiMaxBalls: 9,
    multiSpreadDegrees: 25,
    laserDuration: 15,
    laserCooldown: 1,
    bulletSpeed: 300,
    bulletWidth: 2,
    bulletHeight: 5,
    maxBullets: 4,
  },
  levels: { speedIncreasePerLevel: 0.04, speedIncreasePerLoop: 0.15 },
};
