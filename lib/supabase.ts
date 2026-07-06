// ============================================
// Supabase Client Configuration
// ============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only log in development mode
if (import.meta.env.DEV) {
  console.log('Supabase URL configured:', supabaseUrl ? 'YES' : 'NO');
  console.log('Supabase Anon Key configured:', supabaseAnonKey ? 'YES' : 'NO');
}

// Log warning instead of throwing to prevent blank page
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ CRITICAL: Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). All database queries will fail silently.');
}

// Create typed client (will fail gracefully if credentials missing)
const typedSupabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      }
    })
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

// ============================================
// STORAGE HELPERS
// ============================================
const COURSE_IMAGES_BUCKET = 'course-images';
const EBOOKS_BUCKET = 'ebooks';

export const storageHelpers = {
  /**
   * Upload an image to Supabase Storage
   * @param file - The file to upload
   * @param folder - Folder path within the bucket (e.g., 'thumbnails', 'lessons')
   * @returns The public URL of the uploaded image
   */
  uploadImage: async (file: File, folder: string = 'thumbnails'): Promise<{ url: string; error: string | null }> => {
    if (!supabase) {
      return { url: '', error: 'Supabase client not initialized' };
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(COURSE_IMAGES_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { url: '', error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(COURSE_IMAGES_BUCKET)
        .getPublicUrl(data.path);

      return { url: urlData.publicUrl, error: null };
    } catch (err) {
      console.error('Upload exception:', err);
      return { url: '', error: 'Failed to upload image' };
    }
  },

  /**
   * Delete an image from Supabase Storage
   * @param url - The public URL of the image to delete
   */
  deleteImage: async (url: string): Promise<{ success: boolean; error: string | null }> => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    try {
      // Extract path from URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/course-images\/(.+)/);
      if (!pathMatch) {
        return { success: false, error: 'Invalid storage URL' };
      }

      const filePath = pathMatch[1];
      const { error } = await supabase.storage
        .from(COURSE_IMAGES_BUCKET)
        .remove([filePath]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err) {
      console.error('Delete exception:', err);
      return { success: false, error: 'Failed to delete image' };
    }
  },

  /**
   * Check if a URL is from Supabase Storage
   */
  isSupabaseStorageUrl: (url: string): boolean => {
    return url.includes('/storage/v1/object/public/course-images/');
  },

  /**
   * Upload a paid e-book file to the PRIVATE `ebooks` bucket (audit S2).
   * Unlike uploadImage, this does NOT return a public URL — it returns the
   * storage PATH, which the dashboard exchanges for a short-lived signed URL via
   * the get-ebook-download edge function after enrollment is verified.
   *
   * @param file     the PDF (or other) file to upload
   * @param courseId the owning course id — becomes the first path segment so the
   *                 edge function / storage RLS can scope access per course.
   */
  uploadEbookFile: async (
    file: File,
    courseId: string
  ): Promise<{ path: string; error: string | null }> => {
    if (!supabase) return { path: '', error: 'Supabase client not initialized' };
    if (!courseId) return { path: '', error: 'A course id is required to upload an e-book file' };

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `${courseId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(EBOOKS_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('E-book upload error:', error);
        return { path: '', error: error.message };
      }
      return { path: data.path, error: null };
    } catch (err) {
      console.error('E-book upload exception:', err);
      return { path: '', error: 'Failed to upload e-book file' };
    }
  },

  /** True when a stored e-book "url" is actually a private-bucket storage path. */
  isEbookStoragePath: (value: string): boolean => {
    return !!value && !/^https?:\/\//i.test(value);
  },

  /** Delete an e-book file from the private `ebooks` bucket by its storage path. */
  deleteEbookFile: async (path: string): Promise<{ success: boolean; error: string | null }> => {
    if (!supabase) return { success: false, error: 'Supabase client not initialized' };
    if (!path || /^https?:\/\//i.test(path)) return { success: false, error: 'Not a storage path' };
    try {
      const { error } = await supabase.storage.from(EBOOKS_BUCKET).remove([path]);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err) {
      console.error('E-book delete exception:', err);
      return { success: false, error: 'Failed to delete e-book file' };
    }
  },

  /**
   * Resolve a downloadable URL for an e-book file. External http(s) links are
   * returned as-is; private storage paths are exchanged for a short-lived signed
   * URL via the enrollment-gated get-ebook-download edge function.
   */
  resolveEbookDownloadUrl: async (
    courseId: string,
    urlOrPath: string
  ): Promise<{ url: string; error: string | null }> => {
    if (!urlOrPath) return { url: '', error: 'No file' };
    if (/^https?:\/\//i.test(urlOrPath)) return { url: urlOrPath, error: null };
    if (!supabase) return { url: '', error: 'Supabase client not initialized' };

    const { data, error } = await supabase.functions.invoke('get-ebook-download', {
      body: { courseId, path: urlOrPath },
    });
    if (error) return { url: '', error: error.message };
    if (!data?.success || !data?.url) return { url: '', error: data?.error || 'Download not available' };
    return { url: data.url, error: null };
  },
};
