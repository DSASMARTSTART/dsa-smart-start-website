import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import english from '../locales/en/courses.json';

const f = vi.hoisted(() => ({ peek: vi.fn(), get: vi.fn(), enrolled: vi.fn(), user: null as null | { id: string } }));
const i18n = createInstance();
await i18n.init({
  lng: 'en',
  resources: { en: { translation: english } },
  interpolation: { escapeValue: false },
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: i18n.t.bind(i18n), i18n }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: f.user }) }));
vi.mock('../hooks/useLocalizedCourse', () => ({ useLocalizedCourse: (course: unknown) => course }));
vi.mock('../data/publicCourses', () => ({
  publicCoursesApi: { peekById: f.peek, getById: f.get },
}));
vi.mock('../data/supabaseStore', () => ({ enrollmentsApi: { checkEnrollment: f.enrolled } }));
import EbookDetailPage from './EbookDetailPage';

const course = {
  id: 'one',
  title: 'Cached beginner ebook',
  level: 'A1',
  productType: 'ebook',
  pricing: { price: 20, currency: 'EUR' },
};
const props = {
  courseId: 'one',
  onBack: vi.fn(),
  onEnroll: vi.fn(),
  onAddToCart: vi.fn(),
  isInCart: false,
};
beforeEach(() => {
  f.user = null;
  f.enrolled.mockReset().mockResolvedValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

it('defers enrollment reads for visitors and checks ownership once a user is available', async () => {
  f.peek.mockReturnValue(course);
  f.get.mockResolvedValue(course);
  const view = render(<EbookDetailPage {...props} />);
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(f.enrolled).not.toHaveBeenCalled();
  f.user = { id: 'student' };
  view.rerender(<EbookDetailPage {...props} />);
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(f.enrolled).toHaveBeenCalledWith('student', 'one');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(course.title);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows cached product content immediately while the shared request resolves', async () => {
  f.peek.mockReturnValue(course);
  let finish!: (value: unknown) => void;
  f.get.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(<EbookDetailPage {...props} />);
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading.textContent).toContain(course.title);
  expect(screen.queryByText(english.shared.loadingEbook)).toBeNull();
  await act(async () => {
    finish(course);
  });
  expect(screen.getByRole('heading', { level: 1 })).toBe(heading);
});

it('replaces the loading state instead of recycling its centered nodes into the product hero', async () => {
  f.peek.mockReturnValue(undefined);
  let finish!: (value: unknown) => void;
  f.get.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const { container } = render(<EbookDetailPage {...props} />);
  const loadingRoot = container.firstElementChild;
  expect(screen.getByText(english.shared.loadingEbook)).toBeTruthy();
  await act(async () => {
    finish(course);
  });
  expect(container.firstElementChild).not.toBe(loadingRoot);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(course.title);
});
