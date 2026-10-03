import { describe, expect, it, vi } from 'vitest';
import { needsAuthClient } from './authBootstrap';

const url = 'https://example.supabase.co';
const page = { hash: '#home', search: '' };
describe('auth client bootstrap', () => {
  it('skips the client only when a public page has no saved session', () => {
    const getItem = vi.fn(() => null);
    expect(needsAuthClient(page, { getItem }, url)).toBe(false);
    expect(getItem).toHaveBeenCalledWith('sb-example-auth-token');
    expect(needsAuthClient(page, { getItem: () => 'stored' }, url)).toBe(true);
  });
  it('does not treat campaign query parameters as an authentication callback', () => {
    expect(
      needsAuthClient({ ...page, search: '?utm_source=newsletter' }, { getItem: () => null }, url)
    ).toBe(false);
  });
  it.each([
    '#courses',
    '#courses-ebooks',
    '#courses-live',
    '#ebook-one',
    '#syllabus-one',
    '#live-course-one',
  ])(
    'keeps anonymous product reads independent of auth on %s, but restores saved sessions',
    (hash) => {
      expect(needsAuthClient({ ...page, hash }, { getItem: () => null }, url)).toBe(false);
      expect(needsAuthClient({ ...page, hash }, { getItem: () => 'stored' }, url)).toBe(true);
    }
  );
  it.each(['code=abc', 'auth=teacher-invite', 'error=expired', 'token_hash=abc', 'type=recovery'])(
    'handles callback %s immediately',
    (query) => {
      expect(needsAuthClient({ ...page, search: `?${query}` }, { getItem: () => null }, url)).toBe(
        true
      );
    }
  );
  it.each(['#login', '#dashboard', '#admin', '#reset-password', '#access_token=abc&type=invite'])(
    'initializes for %s',
    (hash) => {
      expect(needsAuthClient({ ...page, hash }, { getItem: () => null }, url)).toBe(true);
    }
  );
  it('falls back to normal auth initialization when storage or configuration cannot be inspected', () => {
    expect(
      needsAuthClient(
        page,
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
        url
      )
    ).toBe(true);
    expect(needsAuthClient(page, { getItem: () => null }, '')).toBe(true);
  });
  it('notifies providers regardless of whether they mount before or after the SDK loads', async () => {
    vi.resetModules();
    const { observeAuthClientReady, announceAuthClientReady } = await import('./authBootstrap');
    const first = vi.fn();
    const stop = observeAuthClientReady(first);
    expect(first).not.toHaveBeenCalled();
    announceAuthClientReady();
    expect(first).toHaveBeenCalledTimes(1);
    stop();
    const second = vi.fn();
    const stopSecond = observeAuthClientReady(second);
    expect(second).toHaveBeenCalledTimes(1);
    announceAuthClientReady();
    expect(first).toHaveBeenCalledTimes(1);
    stopSecond();
  });
});
