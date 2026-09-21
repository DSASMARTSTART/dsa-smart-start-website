import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({
  handler: null as null | ((event: string, session: unknown) => void),
  single: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({
  teacherInviteRedirect: false,
  supabase: {
    auth: {
      onAuthStateChange: (cb: typeof f.handler) => {
        f.handler = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: f.single }) }) }),
  },
}));
vi.mock('../lib/emailService', () => ({ sendWelcomeEmail: vi.fn() }));
import { AuthProvider, useAuth } from './AuthContext';
function Probe() {
  const a = useAuth();
  return (
    <div>
      {a.loading ? 'loading' : a.canAccessAdmin() ? 'admin' : 'denied'}
      <span>{a.profile?.id || 'no-profile'}</span>
    </div>
  );
}
const profile = {
  id: 'one',
  name: 'Admin',
  email: 'qa@example.invalid',
  role: 'admin',
  status: 'active',
};
const session = { user: { id: 'one' } };
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
beforeEach(() => {
  vi.clearAllMocks();
  f.handler = null;
});
describe('profile access loading', () => {
  it('keeps access pending until the profile arrives instead of flashing access denied', async () => {
    let resolve!: (value: unknown) => void;
    f.single.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    act(() => {
      f.handler!('INITIAL_SESSION', session);
    });
    expect(screen.getByText('loading')).toBeTruthy();
    await act(async () => {
      resolve({ data: profile, error: null });
    });
    expect(screen.getByText('admin')).toBeTruthy();
  });
  it('discards a profile that arrives after sign-out', async () => {
    let resolve!: (value: unknown) => void;
    f.single.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    act(() => {
      f.handler!('INITIAL_SESSION', session);
      f.handler!('SIGNED_OUT', null);
    });
    await act(async () => {
      resolve({ data: profile, error: null });
    });
    expect(screen.getByText('no-profile')).toBeTruthy();
    expect(screen.getByText('denied')).toBeTruthy();
  });
  it('does not give paused administrators access', async () => {
    f.single.mockResolvedValue({ data: { ...profile, status: 'paused' }, error: null });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    act(() => {
      f.handler!('INITIAL_SESSION', session);
    });
    await waitFor(() => expect(screen.getByText('denied')).toBeTruthy());
  });
  it('stops loading after a stuck profile request without accepting a late result', async () => {
    vi.useFakeTimers();
    let resolve!: (value: unknown) => void;
    f.single.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    act(() => {
      f.handler!('INITIAL_SESSION', session);
    });
    await act(async () => {
      vi.advanceTimersByTime(8100);
    });
    expect(screen.getByText('denied')).toBeTruthy();
    await act(async () => {
      resolve({ data: profile, error: null });
    });
    expect(screen.getByText('no-profile')).toBeTruthy();
  });
});
