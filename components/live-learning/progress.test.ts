import { describe, expect, it } from 'vitest';
import { lessonProgress } from './progress';
import type { Booking } from './model';
const now = Date.parse('2026-09-21T12:00:00Z');
const base = {
  userId: 'student',
  courseId: 'hybrid',
  kind: 'group',
  creditUsed: true,
  startsAt: '2026-09-22T10:00:00Z',
  endsAt: '2026-09-22T11:00:00Z',
  status: 'booked',
} as Booking;
const allowance = { group: 25, private: 5 };
describe('lesson progress', () => {
  it('separates attendance from bookings, no-shows and unconfirmed past lessons', () => {
    const result = lessonProgress(
      [
        { ...base, id: 'future' },
        { ...base, id: 'attended', status: 'completed', kind: 'private' },
        { ...base, id: 'missed', status: 'no_show' },
        { ...base, id: 'unconfirmed', endsAt: '2026-09-20T11:00:00Z' },
        { ...base, id: 'cancelled', status: 'cancelled', creditUsed: false },
        { ...base, id: 'another-student', userId: 'other' },
        { ...base, id: 'another-package', courseId: 'lab' },
      ],
      'student',
      'hybrid',
      allowance,
      now
    );
    expect(result).toMatchObject({
      completed: 1,
      scheduled: 1,
      otherUsed: 2,
      remaining: 26,
      groupRemaining: 22,
      privateRemaining: 4,
      next: { id: 'future' },
    });
    expect(result.completed + result.scheduled + result.otherUsed + result.remaining).toBe(30);
  });
  it('finds the nearest lesson even when records are unordered and includes an ongoing class', () => {
    const result = lessonProgress(
      [
        { ...base, id: 'later' },
        {
          ...base,
          id: 'ongoing',
          startsAt: '2026-09-21T11:45:00Z',
          endsAt: '2026-09-21T12:15:00Z',
        },
        { ...base, id: 'cancelled', status: 'cancelled', startsAt: '2026-09-21T11:00:00Z' },
      ],
      'student',
      'hybrid',
      allowance,
      now
    );
    expect(result.next?.id).toBe('ongoing');
    expect(result.completed).toBe(0);
  });
  it('starts an unused package at zero attended lessons and full availability', () => {
    expect(lessonProgress([], 'student', 'starter', { group: 0, private: 5 }, now)).toMatchObject({
      total: 5,
      completed: 0,
      scheduled: 0,
      otherUsed: 0,
      remaining: 5,
      next: undefined,
    });
  });
});
