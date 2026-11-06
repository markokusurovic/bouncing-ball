export type Listener<T> = (payload: T) => void;

/** Observer pattern: typed publish/subscribe. `Events` maps names to payloads. */
export class EventBus<Events extends object> {
  private readonly listeners: {
    [K in keyof Events]?: Set<Listener<Events[K]>>;
  } = {};

  /** Subscribes and returns a function that unsubscribes. */
  on<K extends keyof Events>(
    type: K,
    listener: Listener<Events[K]>,
  ): () => void {
    const set = (this.listeners[type] ??= new Set<Listener<Events[K]>>());
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    this.listeners[type]?.forEach((listener) => listener(payload));
  }
}
