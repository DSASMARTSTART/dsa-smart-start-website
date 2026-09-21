import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  invoke: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
  header: vi.fn(),
  options: null as unknown,
  storage: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({
  supabaseAny: {
    functions: { invoke: fixture.invoke },
    rpc: fixture.rpc,
    auth: { getSession: fixture.getSession },
    storage: { from: fixture.storage },
  },
}));
vi.mock('tus-js-client', () => ({
  Upload: class {
    options: { onBeforeRequest: (request: { setHeader: typeof fixture.header }) => Promise<void>; onSuccess: () => void };
    constructor(_file: File, options: { onBeforeRequest: (request: { setHeader: typeof fixture.header }) => Promise<void>; onSuccess: () => void }) {
      this.options = options;
      fixture.options = options;
    }
    start() {
      void Promise.resolve(this.options.onBeforeRequest({ setHeader: fixture.header })).then(() =>
        this.options.onSuccess()
      );
    }
    abort() {
      return Promise.resolve();
    }
  },
}));
import { libraryApi } from './libraryApi';
beforeEach(() => vi.clearAllMocks());
describe('recording upload destination', () => {
  it('sends the file to the Vimeo capability without a Supabase or Vimeo account token', async () => {
    fixture.invoke.mockImplementation(async (_name, { body }) => ({
      data:
        body.action === 'create'
          ? {
              asset: { id: 'asset', provider: 'vimeo', kind: 'recording' },
              uploadUrl: 'https://files.tus.vimeo.com/upload/test',
            }
          : { recordings: [{ id: 'asset', state: 'processing' }] },
      error: null,
    }));
    await libraryApi.upload(
      { kind: 'recording', bookingId: 'booking' },
      'Lesson',
      new File(['abc'], 'lesson.mp4'),
      vi.fn(),
      new AbortController().signal
    );
    expect(fixture.options).toMatchObject({ uploadUrl: 'https://files.tus.vimeo.com/upload/test' });
    expect(fixture.header).not.toHaveBeenCalled();
    expect(fixture.getSession).not.toHaveBeenCalled();
    expect(fixture.storage).not.toHaveBeenCalled();
    expect(fixture.rpc).not.toHaveBeenCalled();
    expect(fixture.invoke.mock.calls[1][1].body).toEqual({ action: 'sync', assetIds: ['asset'] });
  });
});
