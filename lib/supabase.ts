// ============================================
// Supabase Client Configuration
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create typed client
const typedSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export with relaxed typing for flexibility during development
// Once database is stable, can use the typed version directly
export const supabase = typedSupabase as SupabaseClient<Database>;

// Helper to get an untyped reference for dynamic operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAny = typedSupabase as SupabaseClient<any>;

// Helper to check if Supabase is connected
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch {
    return false;
  }
};
