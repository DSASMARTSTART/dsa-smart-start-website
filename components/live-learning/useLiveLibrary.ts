import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { libraryApi, type LiveLibrary } from './libraryApi';
export function useLiveLibrary(courseId?: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [library, setLibrary] = useState<LiveLibrary>({ assets: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    if (!userId) {
      setLibrary({ assets: [], courses: [] });
      setLoading(false);
      return;
    }
    try {
      const result = await libraryApi.list(courseId);
      if (current === version.current) {
        setLibrary(result);
        setError(result.syncError || '');
      }
    } catch (err) {
      if (current === version.current)
        setError(err instanceof Error ? err.message : 'Could not load files.');
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, [courseId, userId]);
  useEffect(() => {
    setLibrary({ assets: [], courses: [] });
    setLoading(true);
    void refresh();
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    const interval = window.setInterval(focus, 30000);
    return () => {
      // Invalidate pending requests when the account/course changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      version.current++;
      window.removeEventListener('focus', focus);
      window.clearInterval(interval);
    };
  }, [refresh]);
  return { ...library, loading, error, refresh };
}
