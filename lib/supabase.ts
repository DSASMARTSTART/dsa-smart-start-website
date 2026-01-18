// ============================================
// Supabase Client Configuration
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debug logging for environment variables
console.log('Supabase URL configured:', supabaseUrl ? 'YES' : 'NO');
console.log('Supabase Anon Key configured:', supabaseAnonKey ? 'YES' : 'NO');

// Log warning instead of throwing to prevent blank page
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create typed client (will fail gracefully if credentials missing)
const typedSupabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Export with relaxed typing for flexibility during development
// Once database is stable, can use the typed version directly
export const supabase = typedSupabase as SupabaseClient<Database>;

// Helper to get an untyped reference for dynamic operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAny = typedSupabase as SupabaseClient<any>;

// Helper to check if Supabase is connected
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!typedSupabase) return false;
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};
