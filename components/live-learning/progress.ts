import type { Booking } from './model';

export function lessonProgress(
  bookings: Booking[],
  userId: string | undefined,
  courseId: string,
  allowance: { group: number; private: number },
  now = Date.now()
) {
  const own = bookings.filter((b) => b.userId === userId && b.courseId === courseId);
  const used = own.filter((b) => b.creditUsed && b.status !== 'cancelled');
  const upcoming = own
    .filter((b) => b.status === 'booked' && Date.parse(b.endsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const total = allowance.group + allowance.private;
  const completed = used.filter((b) => b.status === 'completed').length;
  const scheduled = used.filter((b) => b.status === 'booked' && Date.parse(b.endsAt) > now).length;
  return {
    total,
    completed,
    scheduled,
    otherUsed: used.length - completed - scheduled,
    remaining: Math.max(0, total - used.length),
    next: upcoming[0],
    groupRemaining: Math.max(0, allowance.group - used.filter((b) => b.kind === 'group').length),
    privateRemaining: Math.max(
      0,
      allowance.private - used.filter((b) => b.kind === 'private').length
    ),
  };
}
