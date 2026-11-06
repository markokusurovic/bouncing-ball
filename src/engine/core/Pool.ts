/** Something a pool can hand out and take back. */
export interface Poolable {
  active: boolean;
}

/**
 * Object pool: all objects are created up front and reused, so nothing is
 * allocated during play.
 */
export class Pool<T extends Poolable> {
  readonly items: readonly T[];

  constructor(size: number, create: () => T) {
    this.items = Array.from({ length: size }, create);
  }

  /** An inactive object, now marked active, or null if all are in use. */
  acquire(): T | null {
    const item = this.items.find((candidate) => !candidate.active);
    if (item) item.active = true;
    return item ?? null;
  }

  releaseAll(): void {
    for (const item of this.items) item.active = false;
  }
}
