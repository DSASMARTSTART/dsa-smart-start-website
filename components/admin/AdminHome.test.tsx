import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const f = vi.hoisted(() => ({
  snapshot: vi.fn(),
  people: vi.fn(),
  auth: { user: { id: 'admin' }, profile: { role: 'admin', status: 'active' } },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => f.auth }));
vi.mock('../../lib/adminAnalytics', async (original) => ({
  ...(await original<typeof import('../../lib/adminAnalytics')>()),
  adminAnalyticsApi: { snapshot: f.snapshot, people: f.people },
}));
vi.mock('../../lib/supabase', () => ({ supabaseAny: {} }));
import AdminHome from './AdminHome';
const report = {
  generatedAt: '2026-09-21T12:00:00Z',
  from: '2026-08-23T00:00:00Z',
  to: '2026-09-21T12:00:00Z',
  timezone: 'Europe/Belgrade',
  days: 30,
  currency: 'RSD',
  currencies: ['RSD', 'EUR'],
  summary: {
    studentAccounts: 42,
    enabledAccounts: 40,
    newRegistrations: 12,
    previousRegistrations: 4,
    activeLearners: 9,
    paidOrders: 3,
    netRevenue: 11700,
    previousRevenue: 5000,
    grossRevenue: 12000,
    refundsOnOrders: 300,
    activeEnrollments: 20,
    learningItemsCompleted: 8,
    quizAttempts: 5,
  },
  funnel: { registered: 12, confirmed: 10, signedIn: 9, enrolled: 8, paying: 6 },
  trends: [{ day: '2026-09-21', registrations: 12, orders: 3, revenue: 11700, learning_items: 8 }],
  courses: [],
  paymentsByMethod: [],
  orderStatuses: {},
  live: {
    bookings: 0,
    completedSessions: 0,
    attendances: 0,
    noShows: 0,
    cancelled: 0,
    awaitingAttendance: 0,
    upcoming: 0,
    missingRecordings: 0,
    teachers: [],
  },
  health: {
    accountsWithoutProfile: 0,
    profilesWithoutAccount: 0,
    paidWithoutAccess: 0,
    activeTeachersWithoutLogin: 0,
    activeTeachersWithoutHours: 0,
    failedAssets: 0,
    staleUploads: 0,
    livePackagesWithoutTeachers: 0,
    paymentOrphans: 0,
  },
  recentActivity: [],
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  f.auth.profile = { role: 'admin', status: 'active' };
  f.snapshot.mockResolvedValue(report);
  f.people.mockResolvedValue({
    total: 1,
    page: 1,
    pageSize: 25,
    rows: [
      {
        id: 'person',
        name: 'New student',
        email: 'student@example.invalid',
        status: 'active',
        created_at: report.to,
        email_confirmed_at: null,
        last_sign_in_at: null,
        active_packages: 0,
        live_attended: 0,
        last_learning_activity: null,
      },
    ],
  });
});
describe('admin analytics', () => {
  it('displays server metrics and refetches when the reporting period changes', async () => {
    render(<AdminHome onNavigate={() => {}} />);
    expect(await screen.findByText('42')).toBeTruthy();
    expect(screen.getByLabelText('Revenue currency')).toHaveProperty('value', 'RSD');
    fireEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(f.snapshot).toHaveBeenLastCalledWith(7, ''));
  });
  it('shows an actionable error rather than permanent loading or fake zero counts', async () => {
    f.snapshot.mockRejectedValue(new Error('Reporting unavailable'));
    render(<AdminHome onNavigate={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Reporting unavailable');
    expect(screen.getByRole('button', { name: 'Retry analytics' })).toBeTruthy();
    expect(screen.queryByText('Student accounts · all time')).toBeNull();
  });
  it('opens a specific registered student from the registrations table', async () => {
    const navigate = vi.fn();
    render(<AdminHome onNavigate={navigate} />);
    await screen.findByText('42');
    fireEvent.click(screen.getByRole('button', { name: 'Registrations' }));
    fireEvent.click(await screen.findByRole('button', { name: 'View student' }));
    expect(navigate).toHaveBeenCalledWith('admin-users?user=person');
  });
  it('does not fetch account or revenue analytics for an editor', () => {
    f.auth.profile.role = 'editor';
    render(<AdminHome onNavigate={() => {}} />);
    expect(screen.getByText('Administrator access required')).toBeTruthy();
    expect(f.snapshot).not.toHaveBeenCalled();
  });
});
