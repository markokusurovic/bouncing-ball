/**
 * All tunable numbers of the game. Never hard-code these in logic.
 * Distances are in internal view pixels, times in seconds, angles in degrees.
 */
export interface GameConfig {
  readonly view: { readonly width: number; readonly height: number };
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
    /** Speed in px/s. */
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
}

export const gameConfig: GameConfig = {
  view: { width: 320, height: 240 },
  loop: { updatesPerSecond: 120, maxFrameSeconds: 0.25 },
  paddle: { width: 40, height: 6, y: 222, speed: 240 },
  ball: { radius: 3, speed: 150, maxStep: 1.5, launchSpreadDegrees: 15 },
  bounce: { maxAngleDegrees: 60, minVerticalAngleDegrees: 20 },
};
