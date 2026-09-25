/** Bound database reads, including the response body; preserve cancellation and leave writes/uploads alone. */
export function createReadFetch(fetcher: typeof fetch = fetch, timeoutMs = 15_000): typeof fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url ?? String(input));
    const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
    const readRpc = ['live_workspace', 'live_availability'].some(name => url.pathname === `/rest/v1/rpc/${name}`);
    if (!url.pathname.startsWith('/rest/v1/') || (method !== 'GET' && method !== 'HEAD' && !readRpc)) {
      return fetcher(input, init);
    }
    const controller = new AbortController();
    const signal = init?.signal ?? request?.signal;
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException('The connection timed out. Please try again.', 'TimeoutError')), timeoutMs);
    try {
      const response = await fetcher(input, { ...init, signal: controller.signal });
      // These endpoints return small JSON payloads. Finish reading before clearing
      // the timer, so a server that sends headers then stalls cannot hang the UI.
      const body = response.body ? await response.arrayBuffer() : null;
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  };
}
