import type { InputSource, Renderer, Rng } from '../src/engine/core/interfaces';
import type { Command, GameActions } from '../src/engine/input/commands';
import type { PaletteKey } from '../src/theme/palette';

export type DrawCall =
  | { op: 'clear'; color: PaletteKey }
  | {
      op: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      color: PaletteKey;
    };

export class FakeRenderer implements Renderer {
  calls: DrawCall[] = [];
  clear(color: PaletteKey): void {
    this.calls.push({ op: 'clear', color });
  }
  fillRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: PaletteKey,
  ): void {
    this.calls.push({ op: 'rect', x, y, w, h, color });
  }
}

/** Returns queued commands on the next poll only. */
export class FakeInput implements InputSource {
  private queued: Command[] = [];
  push(...commands: Command[]): void {
    this.queued.push(...commands);
  }
  poll(): readonly Command[] {
    const commands = this.queued;
    this.queued = [];
    return commands;
  }
}

export function fixedRng(value: number): Rng {
  return { next: () => value };
}

/** Records which actions a command triggered. */
export class RecordingActions implements GameActions {
  calls: string[] = [];
  movePaddleBy(direction: -1 | 1): void {
    this.calls.push(`moveBy ${direction}`);
  }
  movePaddleTo(centerX: number): void {
    this.calls.push(`moveTo ${centerX}`);
  }
  fire(): void {
    this.calls.push('fire');
  }
  togglePause(): void {
    this.calls.push('pause');
  }
}
