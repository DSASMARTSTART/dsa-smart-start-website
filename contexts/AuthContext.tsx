import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
    if (!supabase) return;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setProfile({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        avatarUrl: data.avatar_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastActivityAt: data.last_activity_at,
        adminNotes: data.admin_notes,
      });
    }
  };

  useEffect(() => {
    // Handle case where Supabase is not configured
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Initialize auth state
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        // Note: don't set loading to false here, only on initial load
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { name }
      }
    });
    
    if (!error && data.user && supabase) {
      // Create user profile in users table
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role: 'student',
        status: 'active',
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
