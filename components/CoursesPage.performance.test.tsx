import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../lib/lazyPage', async () => ({ lazyPage: (await import('react')).lazy }));
vi.mock('../data/publicCourses', () => ({
  publicCoursesApi: { peek: () => undefined, list: f.list },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../hooks/useLocalizedCourse', () => ({
  useLocalizedCourses: (courses: unknown) => courses,
}));
import CoursesPage from './CoursesPage';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows the real catalogue heading while products are still downloading', async () => {
  let finish!: (value: unknown[]) => void;
  f.list.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  render(<CoursesPage />);
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading.textContent).toContain('coursesPage.hero.titleLine1');
  expect(screen.getByRole('status')).toBeTruthy();
  expect(screen.queryByText('coursesPage.emptyStates.liveComingSoonTitle')).toBeNull();
  await act(async () => {
    finish([]);
  });
  expect(screen.getByRole('heading', { level: 1 })).toBe(heading);
  expect(screen.queryByRole('status')).toBeNull();
});
