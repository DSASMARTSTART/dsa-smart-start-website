import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTranslationBackend } from './translationBackend';
import { createInstance } from 'i18next';

afterEach(() => vi.useRealTimers());

describe('translation download recovery', () => {
  it('finishes initialization in English when the selected locale fails', async () => {
    const i18n = createInstance();
    await i18n
      .use(
        createTranslationBackend({
          '../locales/it/common.json': () => Promise.reject(new Error('Offline')),
        })
      )
      .init({
        lng: 'it',
        fallbackLng: 'en',
        ns: ['common'],
        defaultNS: 'common',
        partialBundledLanguages: true,
        resources: { en: { common: { title: 'Welcome' } } },
      });
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('title')).toBe('Welcome');
    expect(i18n.language).toBe('it'); // Do not erase the visitor's preference.
  });

  it('bounds stalled downloads and ignores a late result', async () => {
    vi.useFakeTimers();
    let resolve!: (value: Record<string, unknown>) => void;
    const callback = vi.fn();
    const backend = createTranslationBackend({
      '../locales/it/home.json': () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    backend.read('it', 'home', callback);
    await vi.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
    resolve({ title: 'Ciao' });
    await Promise.resolve();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('loads only the requested namespace and clears its timeout', async () => {
    vi.useFakeTimers();
    const home = vi.fn().mockResolvedValue({ title: 'Ciao' });
    const checkout = vi.fn();
    const callback = vi.fn();
    createTranslationBackend({
      '../locales/it/home.json': home,
      '../locales/it/checkout.json': checkout,
    }).read('it', 'home', callback);
    await vi.advanceTimersByTimeAsync(0);
    expect(callback).toHaveBeenCalledWith(null, { title: 'Ciao' });
    expect(checkout).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
