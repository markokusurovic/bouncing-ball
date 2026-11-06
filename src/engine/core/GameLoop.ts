import { gameConfig, type GameConfig } from '../config/gameConfig';

/** Abstracts `requestAnimationFrame` so the loop can run in tests. */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

export interface LoopTarget {
  update(dt: number): void;
  render(): void;
}

/**
 * Fixed-timestep loop: real elapsed time is collected in an accumulator and
 * spent in equal update steps, so physics is the same at any frame rate.
 * Rendering happens once per frame, decoupled from updates.
 */
export class GameLoop {
  private readonly step: number;
  private accumulator = 0;
  private lastTime: number | null = null;
  private handle: number | null = null;

  constructor(
    private readonly target: LoopTarget,
    private readonly scheduler: FrameScheduler,
    private readonly config: GameConfig['loop'] = gameConfig.loop,
  ) {
    this.step = 1 / config.updatesPerSecond;
  }

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.handle !== null) return;
    this.lastTime = null;
    this.accumulator = 0;
    this.handle = this.scheduler.request(this.frame);
  }

  stop(): void {
    if (this.handle === null) return;
    this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  /** Runs as many fixed updates as `seconds` allows. Returns how many ran. */
  advance(seconds: number): number {
    this.accumulator += clampFrame(seconds, this.config.maxFrameSeconds);
    let steps = 0;
    while (this.accumulator >= this.step) {
      this.target.update(this.step);
      this.accumulator -= this.step;
      steps++;
    }
    return steps;
  }

  private readonly frame = (timeMs: number): void => {
    if (this.lastTime !== null) this.advance((timeMs - this.lastTime) / 1000);
    this.lastTime = timeMs;
    this.target.render();
    if (this.handle !== null) this.handle = this.scheduler.request(this.frame);
  };
}

function clampFrame(seconds: number, max: number): number {
  return Math.min(Math.max(seconds, 0), max);
}
