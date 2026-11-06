/** What a command can ask the game to do. Implemented by `Game`. */
export interface GameActions {
  movePaddleBy(direction: -1 | 1): void;
  movePaddleTo(centerX: number): void;
  fire(): void;
  togglePause(): void;
  toggleMute(): void;
  /** Initials entry: cycle the current letter through the alphabet. */
  changeLetter(direction: -1 | 1): void;
  /** Initials entry: go back one letter. */
  previousLetter(): void;
}

/** Command pattern: an input turned into an object the game executes. */
export interface Command {
  execute(actions: GameActions): void;
}

export const MoveLeft: Command = { execute: (a) => a.movePaddleBy(-1) };
export const MoveRight: Command = { execute: (a) => a.movePaddleBy(1) };
export const Fire: Command = { execute: (a) => a.fire() };
export const Pause: Command = { execute: (a) => a.togglePause() };
export const Mute: Command = { execute: (a) => a.toggleMute() };
export const LetterUp: Command = { execute: (a) => a.changeLetter(1) };
export const LetterDown: Command = { execute: (a) => a.changeLetter(-1) };
export const LetterBack: Command = { execute: (a) => a.previousLetter() };

/** Moves the paddle center to `x` (view pixels). Mutable so it can be reused. */
export class MoveTo implements Command {
  constructor(public x: number) {}

  execute(actions: GameActions): void {
    actions.movePaddleTo(this.x);
  }
}
