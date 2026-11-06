import type { InputSource } from '../core/interfaces';
import { Fire, MoveTo, type Command } from './commands';
import { HELD_KEYS, PRESSED_KEYS } from './keyMap';

/**
 * Collects raw key and pointer input between updates and hands it to the game
 * as commands. Platform code (DOM listeners) only forwards events here.
 */
export class InputBuffer implements InputSource {
  private readonly held = new Set<string>();
  private readonly pressed: Command[] = [];
  private readonly moveTo = new MoveTo(0);
  private pointerMoved = false;
  private readonly polled: Command[] = [];

  /** Returns true if the key is used by the game. */
  keyDown(code: string, repeat = false): boolean {
    if (HELD_KEYS[code]) {
      this.held.add(code);
      return true;
    }
    const command = PRESSED_KEYS[code];
    if (!command) return false;
    if (!repeat) this.pressed.push(command);
    return true;
  }

  keyUp(code: string): void {
    this.held.delete(code);
  }

  /** `x` is in view pixels. */
  pointerMove(x: number): void {
    this.moveTo.x = x;
    this.pointerMoved = true;
  }

  pointerDown(): void {
    this.pressed.push(Fire);
  }

  /** Forget held keys, e.g. when the window loses focus. */
  releaseAll(): void {
    this.held.clear();
  }

  /** Commands since the last poll. The returned array is reused; don't keep it. */
  poll(): readonly Command[] {
    this.polled.length = 0;
    for (const code of this.held) {
      const command = HELD_KEYS[code];
      if (command) this.polled.push(command);
    }
    if (this.pointerMoved) {
      this.polled.push(this.moveTo);
      this.pointerMoved = false;
    }
    this.polled.push(...this.pressed);
    this.pressed.length = 0;
    return this.polled;
  }
}
