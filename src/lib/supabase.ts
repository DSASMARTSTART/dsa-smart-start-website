// Re-export from main lib to avoid duplicate Supabase clients
// This ensures consistent behavior across the application
export { supabase, supabaseAny, checkSupabaseConnection, storageHelpers } from '../../lib/supabase';
