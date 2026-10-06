import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabaseAny: { rpc } }));
import CourseAccessDates from './CourseAccessDates';
beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (name) => ({
    data:
      name === 'live_enrollment_terms'
        ? [
            {
              id: 'owned-course',
              student: 'QA Student',
              course: 'Hybrid Pack',
              status: 'active',
              courseEndsAt: null,
              downloadsUntil: null,
            },
          ]
        : null,
    error: null,
  }));
});
afterEach(cleanup);
async function selectStudent() {
  render(<CourseAccessDates />);
  await screen.findByRole('option', { name: /QA Student/ });
  fireEvent.change(screen.getByLabelText('Student and package'), {
    target: { value: 'owned-course' },
  });
}
it('saves ongoing access without requiring or inventing dates', async () => {
  await selectStudent();
  expect(screen.queryByLabelText('Course ends')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save recording access' }));
  await screen.findByText('Recording access saved.');
  expect(rpc).toHaveBeenCalledWith('save_live_course_terms', {
    p_enrollment: 'owned-course',
    p_end: null,
    p_download_until: null,
  });
});
it('allows staff to set deadlines and surfaces a rejected change', async () => {
  await selectStudent();
  fireEvent.change(screen.getByLabelText('Access duration'), { target: { value: 'limited' } });
  fireEvent.change(screen.getByLabelText('Course ends'), { target: { value: '2027-01-15T10:00' } });
  fireEvent.change(screen.getByLabelText('Downloads available until'), {
    target: { value: '2027-02-15T10:00' },
  });
  rpc.mockResolvedValueOnce({
    error: { message: 'The end date would exclude a scheduled lesson.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save recording access' }));
  await screen.findByText('The end date would exclude a scheduled lesson.');
  expect(rpc).toHaveBeenCalledWith('save_live_course_terms', {
    p_enrollment: 'owned-course',
    p_end: new Date('2027-01-15T10:00').toISOString(),
    p_download_until: new Date('2027-02-15T10:00').toISOString(),
  });
  expect(screen.queryByText('Recording access saved.')).toBeNull();
});
