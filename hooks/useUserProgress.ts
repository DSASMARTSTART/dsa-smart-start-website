import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useCallback } from 'react';

const LOCAL_STORAGE_KEY = 'dsa_progress';

// Matches the database schema
interface ProgressRecord {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string | null;
  homework_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
}

// Simple key-value format used in App.tsx: "courseId_itemKey" -> boolean
type ProgressMap = Record<string, boolean>;

// Helper to convert database records to simple map
function recordsToMap(records: ProgressRecord[]): ProgressMap {
  const map: ProgressMap = {};
  for (const record of records) {
    const itemKey = record.lesson_id || record.homework_id || 'course';
    const key = `${record.course_id}_${itemKey}`;
    map[key] = record.is_completed;
  }
  return map;
}

// Helper to get progress from localStorage
function getLocalProgress(): ProgressMap {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Helper to save progress to localStorage
function setLocalProgress(progress: ProgressMap): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage:', e);
  }
}

export function useUserProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch progress from Supabase (if logged in) or localStorage
  const progressQuery = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async (): Promise<ProgressMap> => {
      // Not logged in - use localStorage only
      if (!user) {
        return getLocalProgress();
      }

      // Logged in - fetch from Supabase
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('progress')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          // If table doesn't exist, fall back to localStorage
          if (error.code === '42P01') {
            console.warn('progress table does not exist, using localStorage');
            return getLocalProgress();
          }
          throw error;
        }

        const dbProgress = recordsToMap(data || []);
        
        // Also update localStorage as a cache
        setLocalProgress(dbProgress);
        
        return dbProgress;
      } catch (err) {
        console.error('Error fetching progress from Supabase:', err);
        // Fall back to localStorage on error
        return getLocalProgress();
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync localStorage to Supabase when user logs in
  useEffect(() => {
    if (!user) return;

    const syncLocalToSupabase = async () => {
      const localProgress = getLocalProgress();
      const entries = Object.entries(localProgress);
      
      if (entries.length === 0) return;

      console.log('Syncing local progress to Supabase...');

      for (const [key, isCompleted] of entries) {
        const [courseId, ...itemParts] = key.split('_');
        const itemKey = itemParts.join('_');
        
        if (!courseId || !itemKey) continue;

        try {
          // Determine if it's a lesson or homework based on naming convention
          const isHomework = itemKey.includes('homework') || itemKey.startsWith('hw');
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('progress')
            .upsert({
              user_id: user.id,
              course_id: courseId,
              lesson_id: isHomework ? null : itemKey,
              homework_id: isHomework ? itemKey : null,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null,
            }, {
              onConflict: 'user_id,course_id,lesson_id,homework_id',
            });
        } catch (err) {
          console.error('Error syncing progress item:', err);
        }
      }

      // Refresh the query after sync
      queryClient.invalidateQueries({ queryKey: ['userProgress', user.id] });
    };

    syncLocalToSupabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only run when user ID changes (login/logout)

  // Update progress mutation
  const updateProgress = useMutation({
    mutationFn: async ({ 
      courseId, 
      itemKey, 
      isCompleted 
    }: { 
      courseId: string; 
      itemKey: string; 
      isCompleted: boolean;
    }) => {
      const progressKey = `${courseId}_${itemKey}`;

      // Always update localStorage first (works offline)
      const current = getLocalProgress();
      current[progressKey] = isCompleted;
      setLocalProgress(current);

      // If logged in, also update Supabase
      if (user) {
        const isHomework = itemKey.includes('homework') || itemKey.startsWith('hw');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('progress')
          .upsert({
            user_id: user.id,
            course_id: courseId,
            lesson_id: isHomework ? null : itemKey,
            homework_id: isHomework ? itemKey : null,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          }, {
            onConflict: 'user_id,course_id,lesson_id,homework_id',
          });

        if (error && error.code !== '42P01') {
          console.error('Error saving progress to Supabase:', error);
          // Don't throw - localStorage already has the update
        }
      }

      return { [progressKey]: isCompleted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress', user?.id] });
    },
  });

  // Toggle progress helper (matches App.tsx usage)
  const toggleProgress = useCallback((courseId: string, itemKey: string) => {
    const progressKey = `${courseId}_${itemKey}`;
    const current = progressQuery.data || {};
    const newValue = !current[progressKey];
    
    updateProgress.mutate({ courseId, itemKey, isCompleted: newValue });
  }, [progressQuery.data, updateProgress]);

  // Check if an item is completed
  const isCompleted = useCallback((courseId: string, itemKey: string): boolean => {
    const progressKey = `${courseId}_${itemKey}`;
    return progressQuery.data?.[progressKey] ?? false;
  }, [progressQuery.data]);

  // Get completion count for a course
  const getCourseProgress = useCallback((courseId: string): { completed: number; total: number } => {
    const progress = progressQuery.data || {};
    const courseKeys = Object.keys(progress).filter(key => key.startsWith(`${courseId}_`));
    const completed = courseKeys.filter(key => progress[key]).length;
    return { completed, total: courseKeys.length };
  }, [progressQuery.data]);

  return {
    // Raw progress map
    progress: progressQuery.data ?? {},
    isLoading: progressQuery.isLoading,
    error: progressQuery.error,
    
    // Mutations
    updateProgress: updateProgress.mutate,
    toggleProgress,
    isUpdating: updateProgress.isPending,
    
    // Helpers
    isCompleted,
    getCourseProgress,
  };
}
