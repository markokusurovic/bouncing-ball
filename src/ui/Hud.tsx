import type { ReactElement } from 'react';
import { palette } from '../theme/palette';

export interface HudState {
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly multiplier: number;
  readonly gameOver: boolean;
}

export const initialHud: HudState = {
  score: 0,
  lives: 0,
  level: 1,
  multiplier: 1,
  gameOver: false,
};

interface HudProps {
  readonly hud: HudState;
  /** Size of one internal pixel in CSS pixels. */
  readonly scale: number;
  /** Height of the HUD strip in internal pixels. */
  readonly height: number;
}

/** Score, combo, level and lives drawn over the top strip of the canvas. */
export function Hud({ hud, scale, height }: HudProps): ReactElement {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between font-mono font-bold uppercase"
        style={{
          height: height * scale,
          fontSize: 8 * scale,
          padding: `0 ${4 * scale}px`,
          color: palette.hudText,
        }}
      >
        <span>
          Score {hud.score}
          {hud.multiplier > 1 && (
            <span style={{ color: palette.hudAccent }}> ×{hud.multiplier}</span>
          )}
        </span>
        <span>Level {hud.level}</span>
        <span>Lives {hud.lives}</span>
      </div>
      {hud.gameOver && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center font-mono font-bold uppercase"
          style={{
            fontSize: 8 * scale,
            gap: 4 * scale,
            color: palette.hudText,
          }}
        >
          <span style={{ fontSize: 16 * scale, color: palette.hudAccent }}>
            Game over
          </span>
          <span>Press Space or click to play again</span>
        </div>
      )}
    </>
  );
}
