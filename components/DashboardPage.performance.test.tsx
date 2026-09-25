import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({
  history: vi.fn(() => new Promise(() => {})),
  rpc: vi.fn((name: string) =>
    name === 'cleanup_stale_pending_purchases'
      ? new Promise(() => {})
      : Promise.resolve({ data: { repaired_count: 0 } })
  ),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  Trans: () => null,
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student', email: 'student@example.invalid' },
    profile: { id: 'student', name: 'Student' },
    loading: false,
    resetPassword: vi.fn(),
  }),
}));
vi.mock('../hooks/useUserProgress', () => ({ useUserProgress: () => ({ progress: {} }) }));
vi.mock('./live-learning/LiveProgramCards', () => ({ default: () => null }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc: f.rpc }, storageHelpers: {} }));
vi.mock('../data/supabaseStore', () => ({
  enrollmentsApi: {
    getByUserWithCourses: async () => [
      {
        id: 'enrollment',
        courseId: 'course',
        status: 'active',
        course: {
          id: 'course',
          title: 'My purchased course',
          level: 'A1',
          productType: 'learndash',
          modules: [],
        },
      },
    ],
  },
  purchasesApi: { getByUser: async () => [] },
  coursesApi: {},
  quizResultsApi: { getResultsForCourses: f.history },
}));
import DashboardPage from './DashboardPage';

afterEach(cleanup);
it('shows purchased courses while housekeeping and quiz history are still pending', async () => {
  render(
    <DashboardPage
      user={{ name: 'Student', email: 'student@example.invalid' }}
      onOpenCourse={() => {}}
      onNavigate={() => {}}
    />
  );
  expect(await screen.findByRole('heading', { name: 'My purchased course' })).toBeTruthy();
  expect(f.history).toHaveBeenCalledWith('student', ['course']);
  expect(f.rpc).toHaveBeenCalledWith('cleanup_stale_pending_purchases', { p_hours_threshold: 24 });
});
