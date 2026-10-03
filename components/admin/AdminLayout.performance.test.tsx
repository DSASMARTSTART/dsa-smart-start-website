import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ count: vi.fn(), loading: false, allowed: true }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'admin', role: 'admin' }, loading: f.loading, canAccessAdmin: () => f.allowed }),
}));
vi.mock('../../data/supabaseStore', () => ({ paymentOrphansApi: { countUnresolved: f.count } }));
import AdminLayout from './AdminLayout';
const layout = () => <AdminLayout currentPath="admin" onNavigate={() => {}} onLogout={() => {}}>Dashboard</AdminLayout>;
beforeEach(() => {
  vi.useFakeTimers();
  f.loading = false; f.allowed = true;
  f.count.mockReset().mockResolvedValue(3);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('does not poll a hidden admin tab and refreshes once when shown', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const view = render(layout());
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
  expect(f.count).not.toHaveBeenCalled();
  hidden.mockReturnValue(false);
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  expect(f.count).toHaveBeenCalledTimes(1);
  view.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(f.count).toHaveBeenCalledTimes(1);
});

it('waits for verified access and stops polling if access is revoked', async () => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  f.loading = true;
  const view = render(layout());
  expect(f.count).not.toHaveBeenCalled();
  f.loading = false;
  await act(async () => { view.rerender(layout()); });
  expect(f.count).toHaveBeenCalledTimes(1);
  f.allowed = false;
  view.rerender(layout());
  await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
  expect(f.count).toHaveBeenCalledTimes(1);
});

it('does not overlap slow badge reads', async () => {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  let finish!: (value: number) => void;
  f.count.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(layout());
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000); });
  expect(f.count).toHaveBeenCalledTimes(1);
  await act(async () => { finish(3); });
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(f.count).toHaveBeenCalledTimes(2);
});
