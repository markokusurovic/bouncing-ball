import type { ReactElement } from 'react';
import type { PowerUpType } from '../engine/powerups/PowerUp';
import { palette } from '../theme/palette';

export interface HudState {
  readonly score: number;
  readonly lives: number;
  readonly level: number;
  readonly multiplier: number;
  /** Timed power-ups currently running. */
  readonly powerUps: readonly PowerUpType[];
}

export const initialHud: HudState = {
  score: 0,
  lives: 0,
  level: 1,
  multiplier: 1,
  powerUps: [],
};

interface HudProps {
  readonly hud: HudState;
  readonly muted: boolean;
  /** Size of one internal pixel in CSS pixels. */
  readonly scale: number;
  /** Height of the HUD strip in internal pixels. */
  readonly height: number;
}

/** Score, combo, level, power-ups and lives over the top strip of the canvas. */
export function Hud({ hud, muted, scale, height }: HudProps): ReactElement {
  const accent = { color: palette.hudAccent };
  return (
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
        {hud.multiplier > 1 && <span style={accent}> ×{hud.multiplier}</span>}
      </span>
      <span>
        Level {hud.level}
        <span style={accent}>{hud.powerUps.map((type) => ` ${type}`)}</span>
      </span>
      <span>
        {muted && <span style={accent}>Muted </span>}
        Lives {hud.lives}
      </span>
    </div>
  );
}
