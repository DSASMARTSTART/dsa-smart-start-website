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

  const fetchProfile = async (userId: string) => {
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

    // Initialize auth state - run once on mount
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // Handle PKCE auth callback: exchange code for session after email confirmation/password reset
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Error exchanging auth code for session:', exchangeError);
          }
          
          // Clean up query string, then navigate to dashboard
          // Use window.location.href so the hash actually changes and triggers routing
          window.history.replaceState({}, '', window.location.pathname);
          window.location.hash = '#dashboard';
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session) {
          // Validate the token is still valid by calling the server
          // getSession() only reads localStorage — the token may be expired
          const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();
          
          if (!isMounted) return;
          
          if (userError || !validUser) {
            // Session token is expired/invalid — clear it so requests fall back to anonymous
            console.warn('Stored session is invalid, clearing:', userError?.message);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          } else {
            setSession(session);
            setUser(validUser);
            await fetchProfile(validUser.id);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
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
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) return { error };
    
    // Check user status after successful authentication
    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('signIn: Failed to check user status:', profileError.message);
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
