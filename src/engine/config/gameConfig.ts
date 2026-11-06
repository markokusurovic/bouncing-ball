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
  levels: { speedIncreasePerLevel: 0.04, speedIncreasePerLoop: 0.15 },
};
