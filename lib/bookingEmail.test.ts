import { describe, expect, it } from 'vitest';
import { bookingEmail } from '../supabase/functions/send-booking-notifications/template';
const payload = {
  title: 'Lesson',
  startsAt: '2026-10-02T10:00:00Z',
  timezone: 'Europe/Belgrade',
  teacher: 'Teacher',
  student: 'Student',
  creditUsed: true,
};
describe('booking email semantics', () => {
  it('does not describe a request as a confirmed lesson and sends staff to the approval queue', () => {
    const result = bookingEmail(
      { event: 'requested', audience: 'admin', payload },
      'https://eduway.academy'
    );
    expect(result.text).toContain('not yet confirmed');
    expect(result.text).toContain('https://eduway.academy/#admin-teachers');
    expect(result.text).toContain('12:00');
  });
  it('distinguishes late student cancellation from teacher cancellation', () => {
    expect(
      bookingEmail({ event: 'student', audience: 'student', payload }, 'https://eduway.academy')
        .text
    ).toContain('credit has been used');
    expect(
      bookingEmail({ event: 'teacher', audience: 'student', payload }, 'https://eduway.academy')
        .text
    ).toContain('credit has been returned');
  });
});
