import { startVisiblePolling } from '../../lib/visiblePolling';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { liveApi, type Workspace, type ProgramSettings } from './api';
import type { Teacher } from './model';
const empty: Workspace = {
  teachers: [],
  bookings: [],
  selections: {},
  settings: {},
  ownTeacherId: null,
};
function useLiveLearningState() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<Workspace>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const [owner, setOwner] = useState(userId);
  const currentOwner = useRef(userId);
  currentOwner.current = userId;
  // Reset only this context on account changes. Keying a wrapper remounted App,
  // discarded in-progress navigation/forms and repeated every page request.
  if (owner !== userId) {
    request.current++;
    setOwner(userId);
    setState(empty);
    setLoading(!!userId);
    setError('');
  }
  const refresh = useCallback(async () => {
    if (currentOwner.current !== userId) return;
    const version = ++request.current;
    if (!userId) {
      setState(empty);
      setLoading(false);
      return;
    }
    try {
      const data = await liveApi.workspace();
      if (version === request.current) {
        setState(data);
        setError('');
      }
    } catch (err) {
      if (version === request.current)
        setError(err instanceof Error ? err.message : 'Could not load live lessons.');
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    // Fetch once for the teacher navigation link; poll only learning/admin views.
    const stopPolling = startVisiblePolling(refresh, () =>
      !!userId && /^#(?:dashboard|live-learning|viewer-|teacher-calendar|admin)/.test(window.location.hash)
    );
    return () => {
      // This counter invalidates network requests, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
      stopPolling();
    };
  }, [refresh, userId]);
  const saveTeacher = async (teacher: Teacher) => {
    await liveApi.saveTeacher(teacher);
    await refresh();
  };
  const selectTeacher = async (courseId: string, teacherId: string) => {
    await liveApi.selectTeacher(courseId, teacherId);
    await refresh();
  };
  const saveSettings = async (program: string, settings: ProgramSettings) => {
    await liveApi.saveSettings(program, settings);
    await refresh();
  };
  const updateBooking = async (
    id: string,
    action: 'cancel' | 'media' | 'completed' | 'no_show',
    zoom?: string,
    recording?: string
  ) => {
    await liveApi.updateBooking(id, action, zoom, recording);
    await refresh();
  };
  return {
    ...state,
    loading,
    error,
    refresh,
    saveTeacher,
    selectTeacher,
    saveSettings,
    updateBooking,
    capacities: Object.fromEntries(
      (Object.entries(state.settings) as [string, ProgramSettings][]).map(([key, value]) => [
        key,
        value.group_capacity,
      ])
    ),
  };
}
const Context = createContext<ReturnType<typeof useLiveLearningState> | null>(null);
function StateProvider({ children }: { children: React.ReactNode }) {
  const state = useLiveLearningState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function LiveLearningProvider({ children }: { children: React.ReactNode }) {
  return <StateProvider>{children}</StateProvider>;
}
export function useLiveLearning() {
  const state = useContext(Context);
  if (!state) throw new Error('Live learning requires LiveLearningProvider');
  return state;
}
