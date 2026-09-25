import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestCache } from './requestCache';

afterEach(() => vi.useRealTimers());
describe('shared course reads', () => {
  it('shares concurrent reads and caches the successful response', async () => {
    const cache = createRequestCache<string>(1000);
    const load = vi.fn().mockResolvedValue('course');
    expect(await Promise.all([cache.get('a', load), cache.get('a', load)])).toEqual([
      'course',
      'course',
    ]);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('keeps filters separate and expires old results', async () => {
    vi.useFakeTimers();
    const cache = createRequestCache<string>(1000);
    const load = vi.fn().mockResolvedValue('ebook');
    await cache.get('ebooks', load);
    expect(await cache.get('live', async () => 'live')).toBe('live');
    vi.advanceTimersByTime(1001);
    await cache.get('ebooks', load);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('does not retain failures or missing courses', async () => {
    const cache = createRequestCache<string | null>(1000);
    await expect(
      cache.get('a', async () => {
        throw new Error('Offline');
      })
    ).rejects.toThrow('Offline');
    expect(await cache.get('a', async () => null)).toBeNull();
    expect(await cache.get('a', async () => 'available')).toBe('available');
  });
  it('discards stale cache writes after a mutation or account change', async () => {
    const cache = createRequestCache<string>(1000);
    let resolve!: (value: string) => void;
    const old = cache.get(
      'a',
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    await Promise.resolve();
    cache.clear();
    expect(await cache.get('a', async () => 'new')).toBe('new');
    resolve('old');
    await old;
    expect(cache.peek('a')).toBe('new');
  });
});
