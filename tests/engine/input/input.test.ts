import { describe, expect, it } from 'vitest';
import { InputBuffer } from '../../../src/engine/input/InputBuffer';
import { HELD_KEYS, PRESSED_KEYS } from '../../../src/engine/input/keyMap';
import { Mute, Pause } from '../../../src/engine/input/commands';
import { RecordingActions } from '../../fakes';

function run(input: InputBuffer): string[] {
  const actions = new RecordingActions();
  for (const command of input.poll()) command.execute(actions);
  return actions.calls;
}

describe('key map', () => {
  it('maps keys to the right commands', () => {
    const actions = new RecordingActions();
    HELD_KEYS['ArrowLeft']?.execute(actions);
    HELD_KEYS['ArrowRight']?.execute(actions);
    PRESSED_KEYS['Space']?.execute(actions);
    PRESSED_KEYS['KeyP']?.execute(actions);
    PRESSED_KEYS['Escape']?.execute(actions);
    PRESSED_KEYS['Enter']?.execute(actions);
    PRESSED_KEYS['KeyM']?.execute(actions);
    PRESSED_KEYS['ArrowUp']?.execute(actions);
    PRESSED_KEYS['ArrowDown']?.execute(actions);
    PRESSED_KEYS['Backspace']?.execute(actions);
    expect(actions.calls).toEqual([
      'moveBy -1',
      'moveBy 1',
      'fire',
      'pause',
      'pause',
      'fire',
      'mute',
      'letter 1',
      'letter -1',
      'back',
    ]);
  });
});

describe('InputBuffer', () => {
  it('repeats held keys every poll until released', () => {
    const input = new InputBuffer();
    expect(input.keyDown('ArrowLeft')).toBe(true);
    expect(run(input)).toEqual(['moveBy -1']);
    expect(run(input)).toEqual(['moveBy -1']);
    input.keyUp('ArrowLeft');
    expect(run(input)).toEqual([]);
  });

  it('fires pressed keys once and ignores auto-repeat', () => {
    const input = new InputBuffer();
    input.keyDown('Space');
    input.keyDown('Space', true);
    expect(run(input)).toEqual(['fire']);
    expect(run(input)).toEqual([]);
  });

  it('reports unknown keys as unhandled', () => {
    expect(new InputBuffer().keyDown('KeyQ')).toBe(false);
  });

  it('turns pointer movement into one MoveTo with the latest position', () => {
    const input = new InputBuffer();
    input.pointerMove(10);
    input.pointerMove(42);
    expect(run(input)).toEqual(['moveTo 42']);
    expect(run(input)).toEqual([]);
  });

  it('queues commands pressed directly, e.g. by touch buttons', () => {
    const input = new InputBuffer();
    input.press(Pause);
    input.press(Mute);
    expect(run(input)).toEqual(['pause', 'mute']);
    expect(run(input)).toEqual([]);
  });

  it('turns a pointer press into Fire', () => {
    const input = new InputBuffer();
    input.pointerDown();
    expect(run(input)).toEqual(['fire']);
  });

  it('forgets held keys on releaseAll', () => {
    const input = new InputBuffer();
    input.keyDown('ArrowRight');
    input.releaseAll();
    expect(run(input)).toEqual([]);
  });
});
