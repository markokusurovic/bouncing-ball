import type { ReactElement, ReactNode } from 'react';
import type { Command } from '../engine/input/commands';
import { palette } from '../theme/palette';

interface TouchButtonProps {
  readonly command: Command;
  readonly onPress: (command: Command) => void;
  /** Size of one internal pixel in CSS pixels. */
  readonly scale: number;
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * An on-screen button that sends a game command, for devices without a
 * keyboard. It reacts on pointerdown, so there is no click delay. It sits
 * beside the canvas in the DOM, so a press never counts as a canvas tap.
 */
export function TouchButton({
  command,
  onPress,
  scale,
  label,
  children,
}: TouchButtonProps): ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      className="pointer-events-auto font-mono font-bold uppercase"
      style={{
        minWidth: 14 * scale,
        padding: `${scale}px ${3 * scale}px`,
        border: `${Math.max(1, scale / 2)}px solid ${palette.hudAccent}`,
        color: palette.hudText,
        backgroundColor: palette.overlay,
      }}
      onPointerDown={() => onPress(command)}
    >
      {children}
    </button>
  );
}
