import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const f = vi.hoisted(() => {
  const course = {
    id: '263c2749-aa03-4399-85c4-d664cc3e2bc5',
    title: 'Hybrid Pack',
    level: 'hybrid-pack',
    productType: 'service',
    contentFormat: 'hybrid',
    modules: [],
    pricing: { price: 599, currency: 'EUR' },
  };
  const teacher = {
    id: 'teacher',
    name: 'Test teacher',
    email: '',
    bio: 'A teacher introduction',
    photo: '',
    video: '',
    timezone: 'Europe/Belgrade',
    languages: 'English',
    programs: ['hybrid-pack'],
    status: 'active',
    weekly: [],
    daysOff: [],
    groups: [],
  };
  const auth = {
    user: { id: 'student' },
    loading: false,
    isAdmin: () => false,
    isEditor: () => false,
  };
  const state = {
    teachers: [teacher],
    selections: { [course.id]: 'teacher' },
    bookings: [] as unknown[],
    loading: false,
    error: '',
    selectTeacher: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    saveTeacher: vi.fn().mockResolvedValue(undefined),
    capacities: { 'hybrid-pack': 4 },
    settings: {},
    ownTeacherId: null,
  };
  const row = {
    id: 'enrollment',
    userId: 'student',
    courseId: course.id,
    status: 'active',
    course,
  };
  const api = { availability: vi.fn(), book: vi.fn() };
  const rows = vi.fn();
  const t = (key: string, options?: { count?: number }) =>
    options?.count !== undefined ? `${key}:${options.count}` : key;
  return { course, teacher, auth, state, row, api, rows, t };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: f.t, i18n: { language: 'en' } }),
  Trans: () => null,
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => f.auth }));
vi.mock('./LiveLearningContext', () => ({ useLiveLearning: () => f.state }));
vi.mock('./api', () => ({ liveApi: f.api }));
vi.mock('./libraryApi', () => ({
  libraryApi: { list: vi.fn().mockResolvedValue({ courses: [], assets: [] }) },
}));
vi.mock('../../data/supabaseStore', () => ({
  enrollmentsApi: {
    getByUserWithCourses: f.rows,
    checkEnrollment: vi.fn().mockResolvedValue(true),
  },
  coursesApi: {
    getById: vi.fn().mockResolvedValue(f.course),
    getForEnrolledUser: vi.fn().mockResolvedValue(f.course),
  },
  videoHelpers: {},
}));
vi.mock('../../hooks/useUserProgress', () => ({
  useUserProgress: () => ({ progress: {}, toggleProgress: vi.fn() }),
}));
import LiveLearningPage from './LiveLearningPage';
import LiveProgramCards from './LiveProgramCards';
import LiveLearningStudio from './LiveLearningStudio';
import CourseViewer from '../CourseViewer';
import type { Course } from '../../types';
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  f.rows.mockResolvedValue([f.row]);
  f.api.availability.mockResolvedValue({ times: ['10:30'], groups: [] });
  f.api.book.mockResolvedValue('booking-id');
  f.state.selections = { [f.course.id]: 'teacher' };
  f.state.bookings = [];
});
describe('live program integration', () => {
  it('opens the existing Hybrid product as live learning through the old course viewer', async () => {
    render(<CourseViewer courseId={f.course.id} onBack={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'live.chooseTitle.' })).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });
  it('persists a reservation only after explicitly confirming an available time', async () => {
    render(<LiveLearningPage courseId={f.course.id} teacherId="teacher" onNavigate={() => {}} />);
    const time = await screen.findByRole('button', { name: '10:30' });
    fireEvent.click(time);
    expect(f.api.book).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'live.confirmBooking' }));
    await waitFor(() =>
      expect(f.api.book).toHaveBeenCalledWith(
        f.course.id,
        'teacher',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        '10:30',
        null
      )
    );
    expect((await screen.findAllByText('live.bookingConfirmed')).length).toBeGreaterThan(0);
    expect(f.state.refresh).toHaveBeenCalled();
  });
  it('shows server rejection instead of a false booking confirmation', async () => {
    f.api.book.mockRejectedValue(new Error('This time is no longer available.'));
    render(<LiveLearningPage courseId={f.course.id} teacherId="teacher" onNavigate={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: '10:30' }));
    fireEvent.click(screen.getByRole('button', { name: 'live.confirmBooking' }));
    await waitFor(() => expect(f.api.availability.mock.calls.length).toBeGreaterThan(1));
    expect(
      (await screen.findAllByText('This time is no longer available.')).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('live.bookingConfirmed')).toBeNull();
  });
  it('requires an active enrollment before showing profiles', async () => {
    f.rows.mockResolvedValue([{ ...f.row, status: 'revoked' }]);
    render(<LiveLearningPage courseId={f.course.id} teacherId="teacher" onNavigate={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'live.accessTitle' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Test teacher' })).toBeNull();
  });
  it('keeps an administrator’s own credit balance separate from other students', async () => {
    f.state.bookings = [
      { courseId: f.course.id, userId: 'other-student', creditUsed: true },
      { courseId: f.course.id, userId: 'student', creditUsed: true },
    ];
    await act(async () => {
      render(<LiveProgramCards courses={[f.course as Course]} onNavigate={() => {}} />);
    });
    expect(screen.getByText('live.creditsRemaining:29')).toBeTruthy();
  });
  it('opens the selected teacher directly at the booking calendar', async () => {
    const navigate = vi.fn();
    await act(async () => {
      render(<LiveProgramCards courses={[f.course as Course]} onNavigate={navigate} />);
    });
    fireEvent.click(screen.getByRole('button', { name: 'live.hub.bookLesson' }));
    expect(navigate).toHaveBeenCalledWith(
      `live-learning?course=${f.course.id}&teacher=teacher&view=book`
    );
  });
  it('opens past lessons directly on the dashboard, with a useful empty state', async () => {
    render(<LiveProgramCards courses={[f.course as Course]} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'live.hub.replays' }));
    expect(await screen.findByRole('heading', { name: 'live.hub.history' })).toBeTruthy();
    expect(screen.getByText('live.hub.emptyHistory')).toBeTruthy();
  });
  it('does not present zero progress as a successful load when the workspace fails', () => {
    f.state.error = 'Could not load live lessons';
    render(<LiveProgramCards courses={[f.course as Course]} />);
    expect(screen.getByRole('alert').textContent).toContain(f.state.error);
    expect(screen.queryByRole('img')).toBeNull();
    f.state.error = '';
  });
  it('saves a teacher from the administrator form to the persistence service', async () => {
    render(<LiveLearningStudio />);
    fireEvent.click(screen.getByRole('button', { name: 'Add teacher' }));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'New Teacher' } });
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: 'teacher@example.invalid' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText(/^Short introduction/), {
      target: { value: 'Patient language teacher.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hybrid Pack/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() =>
      expect(f.state.saveTeacher).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Teacher',
          email: 'teacher@example.invalid',
          programs: ['hybrid-pack'],
        })
      )
    );
    expect(await screen.findByText('Teacher profile saved.')).toBeTruthy();
  });
});
