import { gameConfig } from '../engine/config/gameConfig';
import type { InputBuffer } from '../engine/input/InputBuffer';

/**
 * Forwards DOM keyboard and pointer events to the engine's InputBuffer.
 * Returns a function that removes all listeners.
 */
export function attachBrowserInput(
  canvas: HTMLCanvasElement,
  input: InputBuffer,
): () => void {
  const toViewX = (clientX: number): number => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - canvas.clientLeft;
    return (x / canvas.clientWidth) * gameConfig.view.width;
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (input.keyDown(e.code, e.repeat)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent): void => input.keyUp(e.code);
  const onPointerMove = (e: PointerEvent): void =>
    input.pointerMove(toViewX(e.clientX));
  const onPointerDown = (e: PointerEvent): void => {
    if (e.button === 0) input.pointerDown();
  };
  const onBlur = (): void => input.releaseAll();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('pointerdown', onPointerDown);
  };
}
