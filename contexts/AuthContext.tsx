import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, teacherInviteRedirect } from '../lib/supabase';
import { clearCoursesCache } from '../data/supabaseStore';
import { sendWelcomeEmail } from '../lib/emailService';
import type { Database } from '../lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin' | 'editor';
  status: 'active' | 'paused' | 'deleted';
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  adminNotes?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  canAccessAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string, retries = 2): Promise<UserProfile | null> {
  if (!supabase) {
    console.warn('fetchProfile: Supabase client not initialized');
    return null;
  }
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) {
    // AbortError is transient (navigator.locks contention) — retry once
    if (error.message?.includes('AbortError') && retries > 0) {
      console.warn('fetchProfile: retrying after AbortError…');
      return fetchProfile(userId, retries - 1);
    }
    console.error('fetchProfile: Failed to load user profile:', error.message, error.details);
    return null;
  }

  if (data) {
    const userData = data as UserRow;
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      status: userData.status,
      avatarUrl: userData.avatar_url ?? undefined,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      lastActivityAt: userData.last_activity_at,
      adminNotes: userData.admin_notes ?? undefined,
    } as UserProfile;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequest = useRef(0);

  useEffect(() => {
    // Handle case where Supabase is not configured
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let initialised = false;
    let invitationHandled = false;
    let activeUserId: string | null = null;

    // Check if we arrived with a PKCE code (email confirmation / password reset).
    // detectSessionInUrl: true handles the actual exchange; we just need to
    // redirect to #dashboard afterwards.
    const params = new URLSearchParams(window.location.search);
    const hadPkceCode = params.has('code');

    // Use onAuthStateChange as the SOLE mechanism for session state.
    // This avoids calling getSession() / exchangeCodeForSession() manually,
    // which compete for the navigator.locks auth lock held by the client's
    // internal _initialize() and cause AbortError cascades.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // INITIAL_SESSION fires once after the client finishes initialising
      // (including automatic PKCE code exchange when detectSessionInUrl is true).
      if (event === 'INITIAL_SESSION') {
        initialised = true;

        if (hadPkceCode) {
          // Clean up the ?code= query string, then navigate to dashboard
          window.history.replaceState({}, '', window.location.pathname);
          window.location.hash = teacherInviteRedirect ? '#reset-password' : '#dashboard';
        }
      }

      if (
        session?.user &&
        teacherInviteRedirect &&
        !invitationHandled &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
      ) {
        invitationHandled = true;
        window.history.replaceState({}, '', window.location.pathname);
        window.location.hash = '#reset-password';
      }

      if (activeUserId !== (session?.user.id ?? null)) {
        clearCoursesCache();
      }
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const version = ++profileRequest.current;
        if (activeUserId !== session.user.id || event === 'INITIAL_SESSION') {
          setProfile(null);
          setLoading(true);
        }
        activeUserId = session.user.id;
        // Do not await Supabase calls inside the auth callback. Keep the access
        // check loading until the profile resolves, and discard stale responses.
        const timer = window.setTimeout(() => {
          if (isMounted && version === profileRequest.current) {
            profileRequest.current++;
            setProfile(null);
            setLoading(false);
          }
        }, 8000);
        void fetchProfile(session.user.id)
          .then((nextProfile) => {
            if (isMounted && version === profileRequest.current) setProfile(nextProfile);
          })
          .catch((err) => {
            console.warn('Background profile fetch failed:', err);
            if (isMounted && version === profileRequest.current) setProfile(null);
          })
          .finally(() => {
            window.clearTimeout(timer);
            if (isMounted && version === profileRequest.current) setLoading(false);
          });
      } else {
        profileRequest.current++;
        activeUserId = null;
        setProfile(null);
        setLoading(false);
        // Clear user-specific caches when session ends
        localStorage.removeItem('dsa_progress');
        localStorage.removeItem('dsa_cart');
        localStorage.removeItem('dsa_materials');
        sessionStorage.removeItem('pending_order');
      }

      // Handle password recovery redirect
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#reset-password';
      }

      // Stop loading spinner once initial session is resolved
      if (event === 'INITIAL_SESSION' && !session?.user && isMounted) {
        setLoading(false);
      }
    });

    // Safety timeout: if INITIAL_SESSION never fires (e.g. network issue),
    // force loading to false so the app is never stuck on a spinner.
    const safetyTimer = setTimeout(() => {
      if (isMounted && !initialised) {
        console.warn('Auth init safety timeout — forcing loading to false');
        setLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      // Invalidate network responses, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      profileRequest.current++;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { error };

    // Check user status after successful authentication
    if (data.user) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('status')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // AbortError is transient (navigator.locks contention) — don't block login
          if (profileError.message?.includes('AbortError')) {
            console.warn('signIn: Status check aborted, proceeding with login');
          } else {
            console.error('signIn: Failed to check user status:', profileError.message);
          }
        } else if (profileData) {
          const userStatus = (profileData as Pick<UserRow, 'status'>).status;
          if (userStatus === 'paused') {
            await supabase.auth.signOut();
            return { error: new Error('Your account has been paused. Please contact support.') };
          }
          if (userStatus === 'deleted') {
            await supabase.auth.signOut();
            return { error: new Error('This account has been deactivated.') };
          }
        }
      } catch (e) {
        // Network / AbortError — profile will be checked via onAuthStateChange anyway
        console.warn('signIn: Status check exception, proceeding:', e);
      }
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    // Note: User profile is automatically created by database trigger (handle_new_user)
    // The trigger runs on auth.users INSERT and creates the public.users record

    // Send welcome email (fire-and-forget — don't block signup flow)
    if (!error && data?.user?.email) {
      sendWelcomeEmail({ email: data.user.email, name });
    }

    return { error };
  };

  const clearUserCaches = () => {
    localStorage.removeItem('dsa_progress');
    localStorage.removeItem('dsa_cart');
    localStorage.removeItem('dsa_materials');
    sessionStorage.removeItem('pending_order');
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    clearUserCaches();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });
    return { error };
  };

  const isAdmin = () => profile?.status === 'active' && profile.role === 'admin';
  const isEditor = () =>
    profile?.status === 'active' && (profile.role === 'admin' || profile.role === 'editor');
  const canAccessAdmin = isEditor;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isAdmin,
        isEditor,
        canAccessAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
