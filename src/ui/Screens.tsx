import type { ReactElement, ReactNode } from 'react';
import {
  Fire,
  LetterBack,
  LetterDown,
  LetterUp,
  Pause,
  type Command,
} from '../engine/input/commands';
import type { HighScore } from '../engine/scoring/highScores';
import type { StateName } from '../engine/states/GameState';
import { palette } from '../theme/palette';
import { HighScoreTable } from './HighScoreTable';
import type { HudState } from './Hud';
import { TouchButton } from './TouchButton';

export interface InitialsState {
  readonly initials: string;
  readonly cursor: number;
}

interface ScreensProps {
  readonly state: StateName;
  readonly hud: HudState;
  readonly highScores: readonly HighScore[];
  readonly scoresLoading: boolean;
  readonly initials: InitialsState;
  readonly scale: number;
  readonly volume: number;
  readonly muted: boolean;
  /** Touch device: show tap texts and on-screen buttons. */
  readonly touch: boolean;
  readonly onVolumeChange: (volume: number) => void;
  readonly onPress: (command: Command) => void;
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
  scoresLoading,
  initials,
  scale,
  volume,
  muted,
  touch,
  onVolumeChange,
  onPress,
}: ScreensProps): ReactElement | null {
  const px = (n: number): number => n * scale;
  const title = (text: string): ReactElement => (
    <span style={{ fontSize: px(16), color: palette.hudAccent }}>{text}</span>
  );
  const button = (
    command: Command,
    label: string,
    text: string,
  ): ReactElement => (
    <TouchButton
      command={command}
      onPress={onPress}
      scale={scale}
      label={label}
    >
      {text}
    </TouchButton>
  );
  const tapOr = (keys: string): string => (touch ? 'Tap' : keys);
  let content: ReactNode;
  switch (state) {
    case 'playing':
      return null;
    case 'menu':
      content = (
        <>
          {title('Bouncing Ball')}
          <span>{tapOr('Press Space or click')} to start</span>
          <HighScoreTable
            entries={highScores}
            loading={scoresLoading}
            scale={scale}
          />
          {touch ? (
            <span>Drag: move · Tap: launch and laser</span>
          ) : (
            <>
              <span>← → or mouse: move · Space or click: launch and laser</span>
              <span>P or Esc: pause · M: mute</span>
            </>
          )}
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
          {touch ? (
            button(Pause, 'Resume', 'Resume')
          ) : (
            <span>Press P or Esc to resume</span>
          )}
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
                // Tapping the current letter cycles it, like the ↑ key.
                className={
                  i === initials.cursor ? 'pointer-events-auto' : undefined
                }
                onPointerDown={
                  i === initials.cursor ? () => onPress(LetterUp) : undefined
                }
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
          {touch ? (
            <span className="flex" style={{ gap: px(4) }}>
              {button(LetterUp, 'Next letter', '▲')}
              {button(LetterDown, 'Previous letter', '▼')}
              {button(LetterBack, 'Back', 'Back')}
              {button(Fire, 'OK', 'OK')}
            </span>
          ) : (
            <span>↑ ↓: letter · Space or click: next · Backspace: back</span>
          )}
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
          <span>{tapOr('Press Space or click')} to continue</span>
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
