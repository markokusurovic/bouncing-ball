import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/engine/core/EventBus';

type TestEvents = { hit: { n: number }; other: { s: string } };

describe('EventBus', () => {
  it('delivers payloads to every listener of that event only', () => {
    const bus = new EventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const other = vi.fn();
    bus.on('hit', a);
    bus.on('hit', b);
    bus.on('other', other);
    bus.emit('hit', { n: 1 });
    expect(a).toHaveBeenCalledWith({ n: 1 });
    expect(b).toHaveBeenCalledWith({ n: 1 });
    expect(other).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribing', () => {
    const bus = new EventBus<TestEvents>();
    const listener = vi.fn();
    const off = bus.on('hit', listener);
    off();
    bus.emit('hit', { n: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores events nobody listens to', () => {
    expect(() =>
      new EventBus<TestEvents>().emit('hit', { n: 3 }),
    ).not.toThrow();
  });
});
