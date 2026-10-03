import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({
  handler: null as null | ((event: string, session: unknown) => void),
  single: vi.fn(),
  subscribed: vi.fn(),
  unsubscribe: vi.fn(),
  needsClient: vi.fn(),
  ready: null as null | (() => void),
}));
vi.mock('../lib/authBootstrap', () => ({
  needsAuthClient: f.needsClient,
  observeAuthClientReady: (listener: () => void) => {
    f.ready = listener;
    return () => {
      f.ready = null;
    };
  },
}));
vi.mock('../lib/supabase', () => ({
  teacherInviteRedirect: false,
  supabase: {
    auth: {
      onAuthStateChange: (cb: typeof f.handler) => {
        f.subscribed();
        f.handler = cb;
        return { data: { subscription: { unsubscribe: f.unsubscribe } } };
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
  f.needsClient.mockReturnValue(true);
});
describe('profile access loading', () => {
  it('does not initialize auth for an anonymous informational page', async () => {
    f.needsClient.mockReturnValue(false);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(f.subscribed).not.toHaveBeenCalled();
    expect(screen.getByText('denied')).toBeTruthy();
  });
  it.each(['storage', 'focus', 'hashchange'])(
    'starts auth on a later %s event when needed',
    async (event) => {
      f.needsClient.mockReturnValue(false);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>
      );
      expect(f.subscribed).not.toHaveBeenCalled();
      f.needsClient.mockReturnValue(true);
      await act(async () => {
        window.dispatchEvent(new Event(event));
        await vi.dynamicImportSettled();
      });
      expect(f.subscribed).toHaveBeenCalledTimes(1);
      expect(screen.getByText('loading')).toBeTruthy();
    }
  );
  it('subscribes once if another feature loads the client', async () => {
    f.needsClient.mockReturnValue(false);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {
      f.ready!();
      f.ready!();
      await vi.dynamicImportSettled();
    });
    expect(f.subscribed).toHaveBeenCalledTimes(1);
  });
  it('renders public content before the auth client finishes loading', async () => {
    render(
      <AuthProvider>
        <div>Public page</div>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByText('Public page')).toBeTruthy();
    expect(f.subscribed).not.toHaveBeenCalled();
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(f.subscribed).toHaveBeenCalledTimes(1);
  });
  it('does not subscribe after the provider unmounts during client loading', async () => {
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    view.unmount();
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(f.subscribed).not.toHaveBeenCalled();
  });
  it('cleans up the session listener after initialization', async () => {
    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    view.unmount();
    expect(f.unsubscribe).toHaveBeenCalledTimes(1);
  });
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
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    act(() => {
      f.handler!('INITIAL_SESSION', session);
    });
    expect(screen.getByText('loading')).toBeTruthy();
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await act(async () => {
      await vi.dynamicImportSettled();
    });
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
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    act(() => {
      f.handler!('INITIAL_SESSION', session);
      f.handler!('SIGNED_OUT', null);
    });
    await act(async () => {
      await vi.dynamicImportSettled();
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
    await act(async () => {
      await vi.dynamicImportSettled();
    });
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
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    act(() => {
      f.handler!('INITIAL_SESSION', session);
    });
    await act(async () => {
      vi.advanceTimersByTime(8100);
    });
    expect(screen.getByText('denied')).toBeTruthy();
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await act(async () => {
      resolve({ data: profile, error: null });
    });
    expect(screen.getByText('no-profile')).toBeTruthy();
  });
});
