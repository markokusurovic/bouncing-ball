import { useEffect, useRef, useState, type ReactElement } from 'react';
import { WebAudioPlayer } from '../audio/WebAudioPlayer';
import type { HighScore } from '../engine/scoring/highScores';
import { LocalStorageHighScoreRepository } from '../storage/LocalStorageHighScoreRepository';
import { gameConfig } from '../engine/config/gameConfig';
import { Game } from '../engine/core/Game';
import { GameLoop } from '../engine/core/GameLoop';
import { createSeededRng } from '../engine/core/Rng';
import type { Command } from '../engine/input/commands';
import { InputBuffer } from '../engine/input/InputBuffer';
import type { StateName } from '../engine/states/GameState';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { computeScale } from '../render/scaling';
import { palette } from '../theme/palette';
import { attachBrowserInput } from './attachBrowserInput';
import { Hud, initialHud, type HudState } from './Hud';
import { Screens, type InitialsState } from './Screens';

const {
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  hudHeight: HUD_HEIGHT,
} = gameConfig.view;
/** Space kept free around the canvas (border and page margin), in CSS pixels. */
const MARGIN = 32;
/** Smaller margin for phones, where every pixel counts. */
const SMALL_MARGIN = 4;
/** Below this window width or height (CSS pixels) the small margin is used. */
const SMALL_SCREEN = { width: 640, height: 480 };

interface Viewport {
  readonly scale: number;
  /** The main pointer is a finger, so show touch texts and buttons. */
  readonly touch: boolean;
  /** Taller than wide: ask the player to rotate a touch device. */
  readonly portrait: boolean;
}

function currentViewport(): Viewport {
  const { innerWidth: w, innerHeight: h } = window;
  const margin =
    w < SMALL_SCREEN.width || h < SMALL_SCREEN.height ? SMALL_MARGIN : MARGIN;
  return {
    scale: computeScale(
      w - margin,
      h - margin,
      VIEW_WIDTH,
      VIEW_HEIGHT,
      gameConfig.view.minIntegerScaleFill,
    ),
    touch: window.matchMedia('(pointer: coarse)').matches,
    portrait: h > w,
  };
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The single canvas the game draws on. It always renders at the internal
 * 320×240 resolution and is scaled up by an integer factor with CSS. React
 * only draws the HUD and screen overlays on top of it.
 */
export function GameCanvas(): ReactElement {
  // useRef gives a stable handle to the real <canvas> DOM node, so we can draw
  // on it imperatively. Changing a ref never re-renders the component.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useState holds the viewport (scale, touch, orientation); updating it
  // re-renders with the new CSS size and texts.
  const [viewport, setViewport] = useState<Viewport>(currentViewport);
  const { scale, touch, portrait } = viewport;
  // One input buffer for the component's lifetime (lazy initial state, as for
  // the audio player below), so the on-screen buttons can push commands too.
  const [input] = useState(() => new InputBuffer());
  // The HUD and current screen are plain React state, fed by game events.
  const [hud, setHud] = useState<HudState>(initialHud);
  const [screen, setScreen] = useState<StateName>('menu');
  const [highScores, setHighScores] = useState<readonly HighScore[]>([]);
  const [initials, setInitials] = useState<InitialsState>({
    initials: '',
    cursor: 0,
  });
  // A function passed to useState runs only on the first render ("lazy
  // initial state"), so one audio player lives as long as the component.
  const [audio] = useState(() => new WebAudioPlayer(browserStorage()));
  const [volume, setVolume] = useState(audio.volume);
  const [muted, setMuted] = useState(audio.muted);

  // useEffect runs after React has put the canvas in the DOM. The empty-ish
  // dependency array means: set the game up once on mount (`audio` never
  // changes). The function we return is the cleanup: React calls it on
  // unmount. In development, StrictMode mounts, unmounts and mounts again on
  // purpose to catch missing cleanups; without stopping the loop and removing
  // listeners here we would end up with two games running at once.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Browsers allow sound only after a user gesture.
    const unlockAudio = (): void => audio.unlock();
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    // iOS Safari only lets audio start from touchend, not pointerdown.
    window.addEventListener('touchend', unlockAudio);

    const detachInput = attachBrowserInput(canvas, input);
    const game = new Game({
      renderer: new CanvasRenderer(ctx, VIEW_WIDTH, VIEW_HEIGHT),
      input,
      rng: createSeededRng(Date.now()),
      audio,
      highScores: new LocalStorageHighScoreRepository(browserStorage()),
    });
    const loop = new GameLoop(game, {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    });

    // Subscribe before starting so React sees the first events. Each `on`
    // returns an unsubscribe function, which the cleanup below calls. The
    // functional form `setHud(h => ...)` always updates the latest state.
    const { events } = game;
    const unsubscribe = [
      events.on('scoreChanged', ({ score, multiplier }) =>
        setHud((h) => ({ ...h, score, multiplier })),
      ),
      events.on('livesChanged', ({ lives }) =>
        setHud((h) => ({ ...h, lives })),
      ),
      events.on('levelStarted', ({ level }) =>
        setHud((h) => ({ ...h, level, powerUps: [] })),
      ),
      events.on('powerUpCollected', ({ type }) =>
        setHud((h) =>
          type === 'multi' || h.powerUps.includes(type)
            ? h
            : { ...h, powerUps: [...h.powerUps, type] },
        ),
      ),
      events.on('powerUpExpired', ({ type }) =>
        setHud((h) => ({
          ...h,
          powerUps: h.powerUps.filter((t) => t !== type),
        })),
      ),
      events.on('stateChanged', ({ state }) => setScreen(state)),
      events.on('highScoresChanged', ({ entries }) => setHighScores(entries)),
      events.on('initialsChanged', (value) => setInitials(value)),
      // connectAudio toggles the player first, so this reads the new value.
      events.on('muteToggled', () => setMuted(audio.muted)),
    ];
    game.start();
    loop.start();

    return () => {
      loop.stop();
      audio.stopMusic();
      detachInput();
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchend', unlockAudio);
      for (const off of unsubscribe) off();
    };
  }, [audio, input]);

  // A second effect keeps the viewport in sync with the window size and
  // orientation. The returned function removes the listener on unmount.
  useEffect(() => {
    const onResize = (): void => setViewport(currentViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const changeVolume = (value: number): void => {
    audio.setVolume(value);
    setVolume(audio.volume);
  };

  const press = (command: Command): void => input.press(command);

  return (
    <>
      {touch && portrait && (
        <p
          className="mb-2 text-center font-mono text-sm font-bold uppercase"
          style={{ color: palette.hudAccent }}
        >
          Rotate your device to landscape
        </p>
      )}
      {/* touch-none stops the page from scrolling or zooming while a finger
          drags the paddle; select-none stops long-press text selection. */}
      <div
        className="relative touch-none border-2 select-none"
        style={{ borderColor: palette.canvasBorder }}
      >
        <canvas
          ref={canvasRef}
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          className="block [image-rendering:pixelated]"
          style={{ width: VIEW_WIDTH * scale, height: VIEW_HEIGHT * scale }}
        />
        {screen !== 'menu' && (
          <Hud
            hud={hud}
            muted={muted}
            scale={scale}
            height={HUD_HEIGHT}
            touch={touch}
            onPress={press}
          />
        )}
        <Screens
          state={screen}
          hud={hud}
          highScores={highScores}
          initials={initials}
          scale={scale}
          volume={volume}
          muted={muted}
          touch={touch}
          onVolumeChange={changeVolume}
          onPress={press}
        />
      </div>
    </>
  );
}
