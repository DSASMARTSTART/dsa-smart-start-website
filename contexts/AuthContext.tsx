import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 2) => {
    if (!supabase) {
      console.warn('fetchProfile: Supabase client not initialized');
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      // AbortError is transient (navigator.locks contention) — retry once
      if (error.message?.includes('AbortError') && retries > 0) {
        console.warn('fetchProfile: retrying after AbortError…');
        return fetchProfile(userId, retries - 1);
      }
      console.error('fetchProfile: Failed to load user profile:', error.message, error.details);
      return;
    }

    if (data) {
      const userData = data as UserRow;
      setProfile({
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
      });
    }
  };

  useEffect(() => {
    // Handle case where Supabase is not configured
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let initialised = false;

    // Check if we arrived with a PKCE code (email confirmation / password reset).
    // detectSessionInUrl: true handles the actual exchange; we just need to
    // redirect to #dashboard afterwards.
    const params = new URLSearchParams(window.location.search);
    const hadPkceCode = params.has('code');

    // Use onAuthStateChange as the SOLE mechanism for session state.
    // This avoids calling getSession() / exchangeCodeForSession() manually,
    // which compete for the navigator.locks auth lock held by the client's
    // internal _initialize() and cause AbortError cascades.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // INITIAL_SESSION fires once after the client finishes initialising
        // (including automatic PKCE code exchange when detectSessionInUrl is true).
        if (event === 'INITIAL_SESSION') {
          initialised = true;

          if (hadPkceCode) {
            // Clean up the ?code= query string, then navigate to dashboard
            window.history.replaceState({}, '', window.location.pathname);
            window.location.hash = '#dashboard';
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fire profile fetch in background — don't block auth loading
          fetchProfile(session.user.id).catch((err) => {
            console.warn('Background profile fetch failed:', err);
          });
        } else {
          setProfile(null);
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
        if (event === 'INITIAL_SESSION' && isMounted) {
          setLoading(false);
        }
      }
    );

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
        emailRedirectTo: `${window.location.origin}`
      }
    });
    
    // Debug: Log signup response to help diagnose email issues
    if (import.meta.env.DEV) {
      console.log('SignUp response:', { 
        user: data?.user?.id,
        email: data?.user?.email,
        emailConfirmedAt: data?.user?.email_confirmed_at,
        confirmationSentAt: data?.user?.confirmation_sent_at,
        error: error?.message 
      });
    }
    
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

  const isAdmin = () => profile?.role === 'admin';
  const isEditor = () => profile?.role === 'admin' || profile?.role === 'editor';
  const canAccessAdmin = () => profile?.role === 'admin' || profile?.role === 'editor';

  return (
    <AuthContext.Provider value={{ 
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
      canAccessAdmin
    }}>
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
