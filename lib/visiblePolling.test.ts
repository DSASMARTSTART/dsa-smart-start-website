import { afterEach, expect, it, vi } from 'vitest';
import { startVisiblePolling } from './visiblePolling';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('skips hidden/inactive views and shares simultaneous focus/interval refreshes', async () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  let active = true;
  const refresh = vi.fn().mockResolvedValue(undefined);
  const stop = startVisiblePolling(refresh, () => active);
  await vi.advanceTimersByTimeAsync(0);
  expect(refresh).toHaveBeenCalledTimes(1);
  hidden.mockReturnValue(true);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(refresh).toHaveBeenCalledTimes(1);
  hidden.mockReturnValue(false);
  active = false;
  window.dispatchEvent(new Event('focus'));
  expect(refresh).toHaveBeenCalledTimes(1);
  active = true;
  window.dispatchEvent(new Event('hashchange'));
  window.dispatchEvent(new Event('focus'));
  await Promise.resolve();
  expect(refresh).toHaveBeenCalledTimes(2);
  stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('loads once when a tab opened in the background first becomes visible', async () => {
  vi.useFakeTimers();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const refresh = vi.fn().mockResolvedValue(undefined);
  const stop = startVisiblePolling(refresh, () => false);
  expect(refresh).not.toHaveBeenCalled();
  hidden.mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  expect(refresh).toHaveBeenCalledTimes(1);
  stop();
});
