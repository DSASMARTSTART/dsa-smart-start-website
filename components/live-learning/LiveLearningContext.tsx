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
  const refresh = useCallback(async () => {
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
    void refresh();
    // Refresh on focus and every 30 seconds so teacher edits reach open student calendars.
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    const interval = window.setInterval(focus, 30000);
    return () => {
      // This counter invalidates network requests, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++;
      window.removeEventListener('focus', focus);
      window.clearInterval(interval);
    };
  }, [refresh]);
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
  const { user } = useAuth();
  return (
    <React.Fragment key={user?.id || 'signed-out'}>
      <StateProvider>{children}</StateProvider>
    </React.Fragment>
  );
}
export function useLiveLearning() {
  const state = useContext(Context);
  if (!state) throw new Error('Live learning requires LiveLearningProvider');
  return state;
}
