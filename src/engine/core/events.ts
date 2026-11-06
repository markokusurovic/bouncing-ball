import type { PowerUpType } from '../powerups/PowerUp';
import type { PaletteKey } from '../../theme/palette';

/** Everything the game announces. Score, audio and HUD subscribe to these. */
export type GameEvents = {
  ballLaunched: { x: number };
  paddleHit: { x: number };
  /** A brick was hit but survived (silver), or can't break (metal). */
  brickHit: { x: number; y: number };
  brickDestroyed: { x: number; y: number; points: number; color: PaletteKey };
  /** The last ball in play fell out; this costs a life. */
  ballLost: { x: number };
  powerUpCollected: { type: PowerUpType };
  powerUpExpired: { type: PowerUpType };
  laserFired: { x: number };
  livesChanged: { lives: number };
  extraLife: { score: number };
  levelStarted: { level: number };
  levelCleared: { level: number; lives: number };
  scoreChanged: { score: number; multiplier: number };
  gameOver: { score: number; level: number };
};
