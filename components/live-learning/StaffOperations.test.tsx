import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const f = vi.hoisted(() => ({ rpc: vi.fn(), refresh: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabaseAny: { rpc: f.rpc } }));
vi.mock('./LiveLearningContext', () => ({
  useLiveLearning: () => ({
    teachers: [
      {
        id: 'teacher',
        name: 'Teacher',
        userId: 'teacher-login',
        status: 'active',
        programs: ['hybrid-pack'],
        timezone: 'Europe/Belgrade',
      },
    ],
    bookings: [],
    refresh: f.refresh,
  }),
}));
import StaffOperations from './StaffOperations';
beforeEach(() => {
  f.rpc.mockReset();
  f.refresh.mockReset();
  f.rpc.mockImplementation(async (name) => ({
    data:
      name === 'staff_live_enrollments'
        ? [
            {
              id: 'enrollment',
              userId: 'student',
              courseId: 'course',
              student: 'Ana',
              course: 'Hybrid Pack',
              program: 'hybrid-pack',
              privateCredits: 6,
              privateUsed: 2,
              groupCredits: 25,
              groupUsed: 0,
            },
          ]
        : name === 'staff_live_availability'
          ? { times: ['11:00'], groups: [] }
          : null,
    error: null,
  }));
});
afterEach(cleanup);
describe('staff booking support', () => {
  it('uses the selected enrollment and shared server availability to create a pending request', async () => {
    render(<StaffOperations />);
    await screen.findByRole('option', { name: 'Ana · Hybrid Pack' });
    fireEvent.change(screen.getByLabelText('Student package'), { target: { value: 'enrollment' } });
    expect(screen.getByText(/Private credits: 4 remaining of 6/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Teacher'), { target: { value: 'teacher' } });
    fireEvent.change(screen.getByLabelText("Date in teacher's time zone"), {
      target: { value: '2026-11-01' },
    });
    await screen.findByRole('option', { name: '11:00' });
    fireEvent.change(screen.getByLabelText('Available slot'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Student requested help' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save pending booking' }));
    await screen.findByText(/Pending request saved/);
    expect(f.rpc).toHaveBeenCalledWith('staff_live_booking', {
      p_enrollment: 'enrollment',
      p_teacher: 'teacher',
      p_date: '2026-11-01',
      p_time: '11:00',
      p_group: null,
      p_original: null,
      p_reason: 'Student requested help',
      p_return_credit: true,
    });
  });
  it('keeps failed credit adjustments visible and does not report success', async () => {
    render(<StaffOperations />);
    await screen.findByRole('option', { name: 'Ana · Hybrid Pack' });
    fireEvent.change(screen.getByLabelText('Student package'), { target: { value: 'enrollment' } });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'Correct remaining credits' },
    });
    f.rpc.mockResolvedValueOnce({
      error: { message: 'Cannot remove reserved credits' },
      data: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record credit adjustment' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Cannot remove reserved credits')
    );
    expect(f.refresh).not.toHaveBeenCalled();
  });
});
