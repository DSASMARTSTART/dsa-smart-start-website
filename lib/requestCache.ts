/** Share concurrent reads; never let an invalidated request repopulate the cache. */
export function createRequestCache<T>(ttlMs: number) {
  const values = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Promise<T>>();
  let generation = 0;
  return {
    peek(key: string): T | undefined {
      const entry = values.get(key);
      if (entry && entry.expires > Date.now()) return entry.value;
      values.delete(key);
      return undefined;
    },
    get(key: string, load: () => Promise<T>): Promise<T> {
      const cached = this.peek(key);
      if (cached !== undefined) return Promise.resolve(cached);
      const current = pending.get(key);
      if (current) return current;
      const version = generation;
      const promise = Promise.resolve()
        .then(load)
        .then((value) => {
          if (version === generation && value != null) {
            values.set(key, { value, expires: Date.now() + ttlMs });
          }
          return value;
        })
        .finally(() => {
          if (pending.get(key) === promise) pending.delete(key);
        });
      pending.set(key, promise);
      return promise;
    },
    clear() {
      generation++;
      values.clear();
      pending.clear();
    },
  };
}
