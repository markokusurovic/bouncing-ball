import { Fire, MoveLeft, MoveRight, Pause, type Command } from './commands';

/** Keys (`KeyboardEvent.code`) that repeat their command every update while held. */
export const HELD_KEYS: Readonly<Record<string, Command>> = {
  ArrowLeft: MoveLeft,
  ArrowRight: MoveRight,
};

/** Keys that fire their command once per press. */
export const PRESSED_KEYS: Readonly<Record<string, Command>> = {
  Space: Fire,
  KeyP: Pause,
  Escape: Pause,
};
