import React, { useEffect, useState } from 'react';
import { supabaseAny as db } from '../../lib/supabase';
import {
  bookingEmail,
  type BookingEmailConfig,
} from '../../supabase/functions/send-booking-notifications/template';
const events = [
  'requested',
  'confirmed',
  'rejected',
  'reminder',
  'expired',
  'teacher',
  'student_charged',
  'student_refunded',
  'rescheduled_charged',
  'rescheduled_refunded',
  'meeting_updated',
  'cancelled',
];
export default function BookingEmailSettings() {
  const [config, setConfig] = useState<BookingEmailConfig | null>(null),
    [selected, setSelected] = useState('requested'),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    db.rpc('live_email_configuration').then(({ data, error }) => {
      if (!cancelled) {
        if (error) setMessage(error.message);
        else setConfig(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const entry = config?.templates[selected] || { subject: '', body: '' };
  const preview = config
    ? bookingEmail(
        {
          event: selected.replace(/_(charged|refunded)$/, ''),
          audience: 'student',
          payload: {
            title: 'Sample lesson',
            teacher: 'Teacher',
            student: 'Student',
            startsAt: '2026-11-12T12:00:00Z',
            timezone: 'Europe/Belgrade',
            creditUsed: selected.endsWith('_charged'),
          },
        },
        'https://eduway.academy',
        config
      )
    : null;
  return (
    <section className="ll-panel p-6 space-y-3">
      <h3>Booking email templates</h3>
      <p>
        Edit the wording sent by the booking notification service. Empty fields use the existing
        English wording. Language controls dates and the standard detail labels for all booking
        emails. No email is sent by this preview.
      </p>
      {config && (
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            try {
              const { error } = await db.rpc('save_live_email_configuration', { p_config: config });
              if (error) throw error;
              setMessage('Email templates saved.');
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="ll-field">
            Email language
            <select
              value={config.locale}
              onChange={(e) =>
                setConfig({ ...config, locale: e.target.value as BookingEmailConfig['locale'] })
              }
            >
              {[
                ['en', 'English'],
                ['it', 'Italian'],
                ['sr', 'Serbian'],
                ['es', 'Spanish'],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="ll-field">
            Email event
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {events.map((event) => (
                <option value={event} key={event}>
                  {event.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="ll-field">
            Subject
            <input
              maxLength={150}
              value={entry.subject}
              onChange={(e) =>
                setConfig({
                  ...config,
                  templates: {
                    ...config.templates,
                    [selected]: { ...entry, subject: e.target.value },
                  },
                })
              }
            />
          </label>
          <label className="ll-field">
            Message
            <textarea
              rows={4}
              maxLength={2000}
              value={entry.body}
              onChange={(e) =>
                setConfig({
                  ...config,
                  templates: {
                    ...config.templates,
                    [selected]: { ...entry, body: e.target.value },
                  },
                })
              }
            />
          </label>
          <details>
            <summary>Preview email</summary>
            <strong>{preview?.subject}</strong>
            <pre className="whitespace-pre-wrap break-words text-sm mt-3">{preview?.text}</pre>
          </details>
          <button className="ll-button primary" disabled={busy}>
            Save email templates
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
