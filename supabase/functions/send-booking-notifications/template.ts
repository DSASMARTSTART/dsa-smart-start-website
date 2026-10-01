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
export type BookingEmailConfig = {
  locale: 'en' | 'it' | 'sr' | 'es';
  templates: Record<string, { subject: string; body: string }>;
};
export function bookingEmail(event: BookingEvent, site: string, config?: BookingEmailConfig) {
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
  const key = ['student', 'rescheduled'].includes(event.event)
    ? `${event.event}_${event.payload.creditUsed ? 'charged' : 'refunded'}`
    : messages[event.event]
      ? event.event
      : 'cancelled';
  const override = config?.templates?.[key];
  const defaults = messages[event.event] || messages.cancelled;
  const subject = override?.subject.trim() || defaults[0];
  const explanation = override?.body.trim() || defaults[1];
  const locale = config?.locale || 'en';
  const labels = {
    en: [
      'Teacher',
      'Student',
      'View current details',
      'This email describes a booking update. Your dashboard always shows the current status.',
    ],
    it: [
      'Insegnante',
      'Studente',
      'Visualizza i dettagli aggiornati',
      'Questa email descrive un aggiornamento della prenotazione. La dashboard mostra sempre lo stato attuale.',
    ],
    sr: [
      'Nastavnik',
      'Učenik',
      'Pogledajte trenutne detalje',
      'Ovaj imejl opisuje promenu rezervacije. Vaša kontrolna tabla uvek prikazuje trenutno stanje.',
    ],
    es: [
      'Profesor',
      'Estudiante',
      'Ver los detalles actuales',
      'Este correo informa de una actualización de la reserva. Tu panel siempre muestra el estado actual.',
    ],
  }[locale];
  const { title, startsAt, timezone, teacher, student } = event.payload;
  const time = new Date(startsAt).toLocaleString(locale === 'en' ? 'en-GB' : locale, {
    timeZone: timezone,
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const origin = new URL(site).origin;
  if (!origin.startsWith('https://')) throw new Error('SITE_URL must use HTTPS.');
  const link = `${origin}/#${event.audience === 'admin' ? 'admin-teachers' : event.audience === 'teacher' ? 'teacher-calendar' : 'dashboard'}`;
  return {
    subject: `Eduway · ${subject}`,
    text: `${subject}\n\n${explanation}\n\n${title}\n${time} (${timezone})\n${labels[0]}: ${teacher}\n${labels[1]}: ${student}\n\n${labels[2]}: ${link}\n\n${labels[3]}`,
  };
}
