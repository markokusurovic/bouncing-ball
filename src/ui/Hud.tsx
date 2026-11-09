import type { ReactElement } from 'react';
import { Mute, Pause, type Command } from '../engine/input/commands';
import type { PowerUpType } from '../engine/powerups/PowerUp';
import { palette } from '../theme/palette';
import { TouchButton } from './TouchButton';

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
  /** Show Pause and Mute buttons (no keyboard on phones). */
  readonly touch: boolean;
  readonly onPress: (command: Command) => void;
}

/** Score, combo, level, power-ups and lives over the top strip of the canvas. */
export function Hud({
  hud,
  muted,
  scale,
  height,
  touch,
  onPress,
}: HudProps): ReactElement {
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
      <span className="flex items-center" style={{ gap: 4 * scale }}>
        <span>
          {muted && <span style={accent}>Muted </span>}
          Lives {hud.lives}
        </span>
        {touch && (
          <>
            <TouchButton
              command={Mute}
              onPress={onPress}
              scale={scale}
              label="Mute"
            >
              ♪
            </TouchButton>
            <TouchButton
              command={Pause}
              onPress={onPress}
              scale={scale}
              label="Pause"
            >
              ❚❚
            </TouchButton>
          </>
        )}
      </span>
    </div>
  );
}
