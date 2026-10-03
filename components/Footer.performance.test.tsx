import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ list: vi.fn(async () => []) }));
vi.mock('../data/publicCourses', () => ({ publicCoursesApi: { list: f.list } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useLocalizedCourse', () => ({
  useLocalizedCourses: (courses: unknown) => courses,
}));
import Footer from './Footer';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('waits until the footer is visible instead of competing with a loading product', async () => {
  let notify!: (entries: Partial<IntersectionObserverEntry>[]) => void;
  const disconnect = vi.fn();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof notify, options: IntersectionObserverInit) {
        notify = callback;
        expect(options.rootMargin).toBeUndefined();
        expect(options.threshold).toBeGreaterThan(0);
      }
      observe() {}
      disconnect = disconnect;
    }
  );
  render(<Footer />);
  await act(async () => {
    notify([{ isIntersecting: true, intersectionRatio: 0 }]);
    await vi.dynamicImportSettled();
  });
  expect(f.list).not.toHaveBeenCalled();
  await act(async () => {
    notify([{ isIntersecting: true, intersectionRatio: 0.1 }]);
    await vi.dynamicImportSettled();
  });
  expect(f.list).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalled();
});
