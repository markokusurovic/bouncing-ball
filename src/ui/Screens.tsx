import type { ReactElement, ReactNode } from 'react';
import type { HighScore } from '../engine/scoring/highScores';
import type { StateName } from '../engine/states/GameState';
import { palette } from '../theme/palette';
import { HighScoreTable } from './HighScoreTable';
import type { HudState } from './Hud';

export interface InitialsState {
  readonly initials: string;
  readonly cursor: number;
}

interface ScreensProps {
  readonly state: StateName;
  readonly hud: HudState;
  readonly highScores: readonly HighScore[];
  readonly initials: InitialsState;
  readonly scale: number;
  readonly volume: number;
  readonly muted: boolean;
  readonly onVolumeChange: (volume: number) => void;
}

/**
 * Text overlays for the menu, pause, level-clear and game-over screens. The
 * engine's state machine decides which one shows; React only draws it. The
 * overlay ignores the mouse (pointer-events-none) so clicks reach the canvas.
 */
export function Screens({
  state,
  hud,
  highScores,
  initials,
  scale,
  volume,
  muted,
  onVolumeChange,
}: ScreensProps): ReactElement | null {
  const px = (n: number): number => n * scale;
  const title = (text: string): ReactElement => (
    <span style={{ fontSize: px(16), color: palette.hudAccent }}>{text}</span>
  );
  let content: ReactNode;
  switch (state) {
    case 'playing':
      return null;
    case 'menu':
      content = (
        <>
          {title('Bouncing Ball')}
          <span>Press Space or click to start</span>
          <HighScoreTable entries={highScores} scale={scale} />
          <span>← → or mouse: move · Space or click: launch and laser</span>
          <span>P or Esc: pause · M: mute</span>
          <label
            className="pointer-events-auto flex items-center"
            style={{ gap: px(4) }}
          >
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              style={{ width: px(60), accentColor: palette.hudAccent }}
            />
            {muted && <span>(muted)</span>}
          </label>
        </>
      );
      break;
    case 'paused':
      content = (
        <>
          {title('Paused')}
          <span>Press P or Esc to resume</span>
        </>
      );
      break;
    case 'levelComplete':
      content = (
        <>
          {title(`Level ${hud.level} clear!`)}
          <span>Score {hud.score}</span>
        </>
      );
      break;
    case 'highScoreEntry':
      content = (
        <>
          {title('New high score!')}
          <span>
            Score {hud.score} · Level {hud.level}
          </span>
          <span className="flex" style={{ fontSize: px(16), gap: px(4) }}>
            {[...initials.initials].map((letter, i) => (
              <span
                // Letter slots are fixed positions, so the index is a stable key.
                key={i}
                style={{
                  color:
                    i === initials.cursor ? palette.hudAccent : palette.hudText,
                  borderBottom: `${px(1)}px solid ${
                    i === initials.cursor ? palette.hudAccent : 'transparent'
                  }`,
                }}
              >
                {letter}
              </span>
            ))}
          </span>
          <span>↑ ↓: letter · Space or click: next · Backspace: back</span>
        </>
      );
      break;
    case 'gameOver':
      content = (
        <>
          {title('Game over')}
          <span>
            Score {hud.score} · Level {hud.level}
          </span>
          <span>Press Space or click</span>
        </>
      );
      break;
  }
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center font-mono font-bold uppercase"
      style={{
        fontSize: px(6),
        gap: px(4),
        color: palette.hudText,
        backgroundColor: palette.overlay,
      }}
    >
      {content}
    </div>
  );
}
