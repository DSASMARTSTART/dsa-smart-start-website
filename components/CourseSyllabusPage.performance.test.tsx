import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import english from '../locales/en/courses.json';

const f = vi.hoisted(() => ({
  admin: false,
  publicRead: vi.fn(),
  draftRead: vi.fn(),
  privateLoaded: vi.fn(),
}));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: english } } });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: i18n.t.bind(i18n), i18n }) }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: () => f.admin, isEditor: () => false }),
}));
vi.mock('../hooks/useLocalizedCourse', () => ({ useLocalizedCourse: (course: unknown) => course }));
vi.mock('../data/publicCourses', () => ({
  publicCoursesApi: { peekById: () => undefined, getById: f.publicRead },
}));
vi.mock('../data/supabaseStore', () => {
  f.privateLoaded();
  return { coursesApi: { getByIdForAdmin: f.draftRead } };
});
import CourseSyllabusPage from './CourseSyllabusPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('loads public content without the authenticated store, but preserves admin draft reads', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const course = {
    id: 'one',
    title: 'Public syllabus',
    level: 'A1',
    isPublished: true,
    productType: 'learndash',
    pricing: { price: 20, currency: 'EUR' },
    modules: [],
  };
  f.publicRead.mockResolvedValue(course);
  f.draftRead.mockResolvedValue({ ...course, title: 'Draft syllabus', isPublished: false });
  const element = (
    <CourseSyllabusPage
      courseId="one"
      onBack={vi.fn()}
      onEnroll={vi.fn()}
      onAddToCart={vi.fn()}
      isInCart={false}
    />
  );
  const view = render(element);
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Public syllabus');
  expect(f.privateLoaded).not.toHaveBeenCalled();
  f.admin = true;
  view.rerender(React.cloneElement(element));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  expect(f.draftRead).toHaveBeenCalledWith('one');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Draft syllabus');
});
