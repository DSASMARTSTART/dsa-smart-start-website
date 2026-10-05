import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ purchases: vi.fn(), enrollments: vi.fn(), course: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  Trans: () => null,
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student', email: 'student@example.invalid' },
    profile: { id: 'student', name: 'Student' },
    loading: false,
  }),
}));
vi.mock('../hooks/useUserProgress', () => ({ useUserProgress: () => ({ progress: {} }) }));
vi.mock('./live-learning/LiveProgramCards', () => ({ default: () => null }));
vi.mock('../lib/supabase', () => ({
  supabase: { rpc: async () => ({ data: { repaired_count: 0 } }) },
  storageHelpers: {},
}));
vi.mock('../data/supabaseStore', () => ({
  purchasesApi: { getByUser: f.purchases },
  enrollmentsApi: { getByUserWithCourses: f.enrollments },
  coursesApi: { getById: f.course },
  quizResultsApi: { getResultsForCourses: async () => [] },
}));
import DashboardPage from './DashboardPage';
import CheckoutSuccessPage from './CheckoutSuccessPage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const purchase = (status: string) => ({
  id: 'purchase',
  courseId: 'course',
  status,
  purchasedAt: new Date().toISOString(),
  amount: 35,
  currency: 'EUR',
});

for (const format of ['pdf', 'interactive']) {
  const course = {
    id: 'course',
    title: `Purchased ${format}`,
    level: 'A1',
    contentFormat: format,
    productType: format === 'pdf' ? 'ebook' : 'learndash',
    modules: [],
  };
  it(`dashboard displays a ${format} purchase after failed → completed without a reload`, async () => {
    f.purchases
      .mockResolvedValueOnce([purchase('failed')])
      .mockResolvedValue([purchase('completed')]);
    f.enrollments
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          id: 'enrollment',
          courseId: 'course',
          status: 'active',
          enrolledAt: new Date().toISOString(),
          course,
        },
      ]);
    f.course.mockResolvedValue(course);
    await act(async () => {
      render(<DashboardPage user={null} onOpenCourse={() => {}} />);
    });
    expect(f.purchases).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole('heading', { name: course.title })).toBeTruthy();
    expect(f.purchases).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(f.purchases).toHaveBeenCalledTimes(2); // Stops once confirmed.
  });
  it(`success page observes a ${format} retry until verified confirmation arrives`, async () => {
    f.purchases
      .mockResolvedValueOnce([purchase('failed')])
      .mockResolvedValue([purchase('completed')]);
    f.course.mockResolvedValue(course);
    await act(async () => {
      render(<CheckoutSuccessPage onNavigate={() => {}} />);
    });
    expect(screen.getByText('successPage.statusVerifying')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText('successPage.statusReady')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(f.purchases).toHaveBeenCalledTimes(2);
  });
}

it('dashboard polling remains bounded for an actual failed payment', async () => {
  f.purchases.mockResolvedValue([purchase('failed')]);
  f.enrollments.mockResolvedValue([]);
  await act(async () => {
    render(<DashboardPage user={null} onOpenCourse={() => {}} />);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  const count = f.purchases.mock.calls.length;
  expect(count).toBeGreaterThan(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(f.purchases).toHaveBeenCalledTimes(count);
});

it('success page stops checking an unconfirmed retry and retains its failed status', async () => {
  f.purchases.mockResolvedValue([purchase('failed')]);
  f.course.mockResolvedValue({ id: 'course', title: 'Ebook' });
  await act(async () => {
    render(<CheckoutSuccessPage onNavigate={() => {}} />);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(65000);
  });
  expect(screen.getByText('failed')).toBeTruthy();
  expect(screen.queryByText('successPage.statusReady')).toBeNull();
  const count = f.purchases.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(65000);
  });
  expect(f.purchases).toHaveBeenCalledTimes(count);
});
