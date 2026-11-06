import { describe, expect, it } from 'vitest';
import {
  GameLoop,
  type FrameScheduler,
  type LoopTarget,
} from '../../../src/engine/core/GameLoop';

class FakeScheduler implements FrameScheduler {
  pending: ((timeMs: number) => void) | null = null;
  cancelled: number[] = [];
  requests = 0;
  request(callback: (timeMs: number) => void): number {
    this.pending = callback;
    return ++this.requests;
  }
  cancel(handle: number): void {
    this.cancelled.push(handle);
    this.pending = null;
  }
  tick(timeMs: number): void {
    const callback = this.pending;
    this.pending = null;
    callback?.(timeMs);
  }
}

class CountingTarget implements LoopTarget {
  updates: number[] = [];
  renders = 0;
  update(dt: number): void {
    this.updates.push(dt);
  }
  render(): void {
    this.renders++;
  }
}

// 4 updates/s gives a step of 0.25 s, which is exact in floating point.
const config = { updatesPerSecond: 4, maxFrameSeconds: 1 };

describe('GameLoop.advance', () => {
  it('runs fixed-size updates for the elapsed time', () => {
    const target = new CountingTarget();
    const loop = new GameLoop(target, new FakeScheduler(), config);
    expect(loop.advance(0.5)).toBe(2);
    expect(target.updates).toEqual([0.25, 0.25]);
  });

  it('carries leftover time into the next frame', () => {
    const loop = new GameLoop(
      new CountingTarget(),
      new FakeScheduler(),
      config,
    );
    expect(loop.advance(0.125)).toBe(0);
    expect(loop.advance(0.125)).toBe(1);
  });

  it('clamps long frames to avoid a spiral of death', () => {
    const loop = new GameLoop(
      new CountingTarget(),
      new FakeScheduler(),
      config,
    );
    expect(loop.advance(60)).toBe(4);
  });

  it('ignores negative time', () => {
    const loop = new GameLoop(
      new CountingTarget(),
      new FakeScheduler(),
      config,
    );
    expect(loop.advance(-1)).toBe(0);
  });

  it('uses 120 updates per second by default', () => {
    const target = new CountingTarget();
    new GameLoop(target, new FakeScheduler()).advance(1 / 60);
    expect(target.updates).toEqual([1 / 120, 1 / 120]);
  });
});

describe('GameLoop scheduling', () => {
  it('renders every frame and updates from the second frame on', () => {
    const target = new CountingTarget();
    const scheduler = new FakeScheduler();
    const loop = new GameLoop(target, scheduler, config);
    loop.start();
    expect(loop.running).toBe(true);
    scheduler.tick(1000);
    expect(target.updates).toHaveLength(0);
    expect(target.renders).toBe(1);
    scheduler.tick(1500);
    expect(target.updates).toHaveLength(2);
    expect(target.renders).toBe(2);
    expect(scheduler.pending).not.toBeNull();
  });

  it('requests only one frame when started twice', () => {
    const scheduler = new FakeScheduler();
    const loop = new GameLoop(new CountingTarget(), scheduler, config);
    loop.start();
    loop.start();
    expect(scheduler.requests).toBe(1);
  });

  it('cancels the pending frame on stop', () => {
    const scheduler = new FakeScheduler();
    const loop = new GameLoop(new CountingTarget(), scheduler, config);
    loop.start();
    loop.stop();
    loop.stop();
    expect(scheduler.cancelled).toEqual([1]);
    expect(loop.running).toBe(false);
  });

  it('does not schedule another frame when stopped during a frame', () => {
    const scheduler = new FakeScheduler();
    const target = new CountingTarget();
    const loop = new GameLoop(target, scheduler, config);
    target.render = (): void => loop.stop();
    loop.start();
    scheduler.tick(0);
    expect(scheduler.pending).toBeNull();
    expect(scheduler.requests).toBe(1);
  });
});
