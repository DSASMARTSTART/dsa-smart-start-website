export type BookingEvent = {
  event: string;
  audience: string;
  payload: {
    title: string;
    startsAt: string;
    timezone: string;
    teacher: string;
    student: string;
    creditUsed: boolean;
  };
};
export function bookingEmail(event: BookingEvent, site: string) {
  const messages: Record<string, [string, string]> = {
    reminder: [
      'Lesson reminder',
      'Your confirmed lesson starts within 24 hours. Open your dashboard for the meeting link and current details.',
    ],
    expired: [
      'Lesson request expired',
      'This request was not approved before its start time. The reserved credit has been returned. Please choose another lesson.',
    ],
    requested: [
      'Lesson request received',
      'The slot and credit are reserved. This lesson is pending administration approval and is not yet confirmed.',
    ],
    confirmed: [
      'Lesson confirmed',
      'Administration has approved this lesson. Open your dashboard for the meeting link and latest details.',
    ],
    rejected: [
      'Lesson request declined',
      'The reserved credit has been returned. Please choose another available lesson.',
    ],
    teacher: [
      'Lesson cancelled by teacher',
      'Your credit has been returned. Please arrange a replacement lesson with your teacher.',
    ],
    student: [
      'Lesson cancelled',
      event.payload.creditUsed
        ? 'This was a late cancellation. The lesson credit has been used.'
        : 'The lesson credit has been returned.',
    ],
    rescheduled: [
      'Original lesson rescheduled',
      event.payload.creditUsed
        ? 'The original credit was used because the credit-return cutoff had passed. The new lesson request requires separate administration approval.'
        : 'The original credit was returned. The new lesson request requires separate administration approval.',
    ],
    meeting_updated: [
      'Lesson meeting link updated',
      'Open your dashboard for the current meeting link.',
    ],
    cancelled: [
      'Lesson cancelled',
      'Open your dashboard for the latest lesson and credit details.',
    ],
  };
  const [subject, explanation] = messages[event.event] || messages.cancelled;
  const { title, startsAt, timezone, teacher, student } = event.payload;
  const time = new Date(startsAt).toLocaleString('en-GB', {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const origin = new URL(site).origin;
  if (!origin.startsWith('https://')) throw new Error('SITE_URL must use HTTPS.');
  const link = `${origin}/#${event.audience === 'admin' ? 'admin-teachers' : event.audience === 'teacher' ? 'teacher-calendar' : 'dashboard'}`;
  return {
    subject: `Eduway · ${subject}`,
    text: `${subject}\n\n${explanation}\n\n${title}\n${time} (${timezone})\nTeacher: ${teacher}\nStudent: ${student}\n\nView current details: ${link}\n\nThis email describes a booking update. Your dashboard always shows the current status.`,
  };
}
