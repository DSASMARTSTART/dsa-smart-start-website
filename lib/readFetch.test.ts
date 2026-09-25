import { afterEach, expect, it, vi } from 'vitest';
import { createReadFetch } from './readFetch';
afterEach(() => vi.useRealTimers());
const url = 'https://example.invalid/rest/v1/courses';
it('aborts a stalled read, allowing a subsequent retry to finish', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementationOnce((_input, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  })).mockResolvedValue(new Response('[1]'));
  const read = createReadFetch(fetcher, 100);
  const result = expect(read(url)).rejects.toMatchObject({name:'TimeoutError'});
  await vi.advanceTimersByTimeAsync(100);
  await result;
  expect(await (await read(url)).json()).toEqual([1]);
});
it('preserves caller cancellation and does not impose read timeouts on writes/uploads', async () => {
  const controller = new AbortController();
  const fetcher = vi.fn().mockImplementation((_input, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  }));
  const result = expect(createReadFetch(fetcher)(url, {signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
  controller.abort();
  await result;
  const passthrough = vi.fn().mockResolvedValue(new Response('{}'));
  const init = {method:'POST', body:'{}'};
  await createReadFetch(passthrough)(url, init);
  expect(passthrough).toHaveBeenCalledWith(url, init);
});
it('also times out a JSON body that stalls after the headers arrive', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(async (_input, init) => new Response(new ReadableStream({
    start(controller) { init.signal.addEventListener('abort', () => controller.error(init.signal.reason)); }
  })));
  const result = expect(createReadFetch(fetcher, 100)(url)).rejects.toMatchObject({name:'TimeoutError'});
  await vi.advanceTimersByTimeAsync(100);
  await result;
});
