import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  score: number;
  completed_at: string | null;
}

export function useUserProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
    enabled: !!user,
  });

  const updateProgress = useMutation({
    mutationFn: async (progress: Partial<UserProgress> & { lesson_id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          ...progress,
          completed_at: progress.completed ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress', user?.id] });
    },
  });

  return {
    progress: progressQuery.data ?? [],
    isLoading: progressQuery.isLoading,
    error: progressQuery.error,
    updateProgress: updateProgress.mutate,
    isUpdating: updateProgress.isPending,
  };
}
