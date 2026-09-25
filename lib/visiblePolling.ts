/** Keep active views fresh without duplicate or hidden-tab background reads. */
export function startVisiblePolling(
  refresh: () => Promise<unknown>,
  isActive = () => true,
  intervalMs = 30_000
) {
  let pending = false;
  let stopped = false;
  let lastAttempt = -Infinity;
  const poll = async (initial = false) => {
    if (
      stopped ||
      pending ||
      document.hidden ||
      (!initial && lastAttempt !== -Infinity && (!isActive() || Date.now() - lastAttempt < 10_000))
    )
      return;
    pending = true;
    lastAttempt = Date.now();
    try {
      await refresh();
    } catch (error) {
      console.warn('Background refresh failed:', error);
    } finally {
      pending = false;
    }
  };
  const onVisible = () => {
    void poll();
  };
  void poll(true);
  const interval = window.setInterval(onVisible, intervalMs);
  window.addEventListener('focus', onVisible);
  window.addEventListener('hashchange', onVisible);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('hashchange', onVisible);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
