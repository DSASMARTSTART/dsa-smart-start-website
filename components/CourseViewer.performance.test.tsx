import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({
  user: { id: 'student' } as { id: string } | null,
  loading: false,
  admin: false,
  editor: false,
  enrolledCourse: vi.fn(),
  publicCourse: vi.fn(),
  adminCourse: vi.fn(),
  checkEnrollment: vi.fn(),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../contexts/AuthContext', () => ({
  // New callback identities on every render mirror the real provider.
  useAuth: () => ({ user: f.user, loading: f.loading, isAdmin: () => f.admin, isEditor: () => f.editor }),
}));
vi.mock('../hooks/useUserProgress', () => ({
  useUserProgress: () => ({ progress: {}, toggleProgress: vi.fn() }),
}));
vi.mock('../data/supabaseStore', () => ({
  coursesApi: { getForEnrolledUser: f.enrolledCourse, getById: f.publicCourse, getByIdForAdmin: f.adminCourse },
  enrollmentsApi: { checkEnrollment: f.checkEnrollment },
  videoHelpers: {},
}));
import CourseViewer from './CourseViewer';

const course = (id: string) => ({
  id, title: `Course ${id}`, level: 'A1',
  modules: [{ id: `module-${id}`, title: 'Introduction', lessons: [{ id: `lesson-${id}`, title: 'Welcome', type: 'reading', content: `Lesson ${id}` }] }],
});
const props = { courseId: 'one', onBack: vi.fn() };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  f.user = { id: 'student' }; f.loading = false; f.admin = false; f.editor = false;
  f.enrolledCourse.mockReset().mockResolvedValue(course('one'));
  f.publicCourse.mockReset().mockResolvedValue(course('one'));
  f.adminCourse.mockReset().mockResolvedValue(course('one'));
  f.checkEnrollment.mockReset().mockResolvedValue(false);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('renders a server-authorized course with one read and no public/enrollment waterfall', async () => {
  render(<CourseViewer {...props} />);
  expect(await screen.findByText('Lesson one')).toBeTruthy();
  expect(f.enrolledCourse).toHaveBeenCalledTimes(1);
  expect(f.enrolledCourse).toHaveBeenCalledWith('one');
  expect(f.publicCourse).not.toHaveBeenCalled();
  expect(f.checkEnrollment).not.toHaveBeenCalled();
});

it('keeps published content locked when the server denies enrollment', async () => {
  f.enrolledCourse.mockResolvedValue(null);
  render(<CourseViewer {...props} />);
  expect(await screen.findByText('courseViewer.accessDenied')).toBeTruthy();
  expect(f.checkEnrollment).toHaveBeenCalledWith('student', 'one');
  expect(screen.queryByText('Lesson one')).toBeNull();
});

it.each(['null', 'rejection'])('supports the explicit enrollment fallback for an unavailable RPC (%s)', async mode => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  if (mode === 'null') f.enrolledCourse.mockResolvedValue(null);
  else f.enrolledCourse.mockRejectedValue(new Error('RPC unavailable'));
  f.checkEnrollment.mockResolvedValue(true);
  render(<CourseViewer {...props} />);
  expect(await screen.findByText('Lesson one')).toBeTruthy();
  expect(f.publicCourse).toHaveBeenCalledWith('one');
  expect(f.checkEnrollment).toHaveBeenCalledWith('student', 'one');
});

it.each(['admin', 'editor'] as const)('preserves draft previews for %s', async role => {
  f[role] = true;
  render(<CourseViewer {...props} />);
  expect(await screen.findByText('Lesson one')).toBeTruthy();
  expect(f.adminCourse).toHaveBeenCalledWith('one');
  expect(f.enrolledCourse).not.toHaveBeenCalled();
});

it('waits for session restoration and avoids refetches caused by callback identity changes', async () => {
  f.loading = true;
  const view = render(<CourseViewer {...props} />);
  expect(f.enrolledCourse).not.toHaveBeenCalled();
  f.loading = false;
  view.rerender(<CourseViewer {...props} />);
  expect(await screen.findByText('Lesson one')).toBeTruthy();
  view.rerender(<CourseViewer {...props} />);
  expect(f.enrolledCourse).toHaveBeenCalledTimes(1);
});

it('ignores late responses from the previous course', async () => {
  const old = deferred<ReturnType<typeof course>>();
  f.enrolledCourse.mockReturnValueOnce(old.promise).mockResolvedValueOnce(course('two'));
  const view = render(<CourseViewer {...props} />);
  view.rerender(<CourseViewer {...props} courseId="two" />);
  expect(await screen.findByText('Lesson two')).toBeTruthy();
  await act(async () => { old.resolve(course('one')); });
  expect(screen.queryByText('Lesson one')).toBeNull();
  expect(screen.getByText('Lesson two')).toBeTruthy();
});

it('ignores late authorized responses after logout and makes no anonymous RPC', async () => {
  const old = deferred<ReturnType<typeof course>>();
  f.enrolledCourse.mockReturnValueOnce(old.promise);
  const view = render(<CourseViewer {...props} />);
  f.user = null;
  view.rerender(<CourseViewer {...props} />);
  expect(await screen.findByText('courseViewer.accessDenied')).toBeTruthy();
  await act(async () => { old.resolve(course('one')); });
  expect(screen.queryByText('Lesson one')).toBeNull();
  expect(f.enrolledCourse).toHaveBeenCalledTimes(1);
  expect(f.checkEnrollment).not.toHaveBeenCalled();
});

it('removes the previous lesson immediately when switching users', async () => {
  const next = deferred<ReturnType<typeof course> | null>();
  const view = render(<CourseViewer {...props} />);
  expect(await screen.findByText('Lesson one')).toBeTruthy();
  f.enrolledCourse.mockReturnValueOnce(next.promise);
  f.user = { id: 'another-student' };
  view.rerender(<CourseViewer {...props} />);
  expect(screen.queryByText('Lesson one')).toBeNull();
  expect(screen.getByText('courseViewer.loading')).toBeTruthy();
  await act(async () => { next.resolve(null); });
  expect(await screen.findByText('courseViewer.accessDenied')).toBeTruthy();
});
