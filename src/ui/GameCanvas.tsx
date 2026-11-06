import { useEffect, useRef, useState, type ReactElement } from 'react';
import { gameConfig } from '../engine/config/gameConfig';
import { Game } from '../engine/core/Game';
import { GameLoop } from '../engine/core/GameLoop';
import { createSeededRng } from '../engine/core/Rng';
import { InputBuffer } from '../engine/input/InputBuffer';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { computeScale } from '../render/scaling';
import { palette } from '../theme/palette';
import { attachBrowserInput } from './attachBrowserInput';

const { width: VIEW_WIDTH, height: VIEW_HEIGHT } = gameConfig.view;
/** Space kept free around the canvas (border and page margin), in CSS pixels. */
const MARGIN = 32;

function currentScale(): number {
  return computeScale(
    window.innerWidth - MARGIN,
    window.innerHeight - MARGIN,
    VIEW_WIDTH,
    VIEW_HEIGHT,
  );
}

/**
 * The single canvas the game draws on. It always renders at the internal
 * 320×240 resolution and is scaled up by an integer factor with CSS.
 */
export function GameCanvas(): ReactElement {
  // useRef gives a stable handle to the real <canvas> DOM node, so we can draw
  // on it imperatively. Changing a ref never re-renders the component.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useState holds the scale; updating it re-renders with the new CSS size.
  const [scale, setScale] = useState<number>(currentScale);

  // useEffect runs after React has put the canvas in the DOM. The empty
  // dependency array means: set the game up once on mount. The function we
  // return is the cleanup: React calls it on unmount. In development,
  // StrictMode mounts, unmounts and mounts again on purpose to catch missing
  // cleanups; without stopping the loop and removing listeners here we would
  // end up with two games running at once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const input = new InputBuffer();
    const detachInput = attachBrowserInput(canvas, input);
    const game = new Game({
      renderer: new CanvasRenderer(ctx, VIEW_WIDTH, VIEW_HEIGHT),
      input,
      rng: createSeededRng(Date.now()),
    });
    const loop = new GameLoop(game, {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    });
    loop.start();

    return () => {
      loop.stop();
      detachInput();
    };
  }, []);

  // A second effect keeps the scale in sync with the window size. The returned
  // function removes the listener when the component unmounts.
  useEffect(() => {
    const onResize = (): void => setScale(currentScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_WIDTH}
      height={VIEW_HEIGHT}
      className="block border-2 [image-rendering:pixelated]"
      style={{
        width: VIEW_WIDTH * scale,
        height: VIEW_HEIGHT * scale,
        borderColor: palette.canvasBorder,
      }}
    />
  );
}
