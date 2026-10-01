import BookingEmailSettings from './BookingEmailSettings';
import React, { useState } from 'react';
import { useLiveLearning } from './LiveLearningContext';
import type { ProgramSettings } from './api';
import VideoStorage from './VideoStorage';
import BookingOperations from './BookingOperations';
import CourseAccessDates from './CourseAccessDates';
import { programs } from './model';
function Rules({ initial }: { initial: ProgramSettings }) {
  const { saveSettings } = useLiveLearning();
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <form
      className="ll-panel p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          await saveSettings(draft.program, draft);
          setMessage('Rules saved.');
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Could not save rules.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{programs.find((p) => p.id === draft.program)?.name}</h3>
      <div className="grid gap-4 mt-5 sm:grid-cols-2">
        {(
          [
            { key: 'notice_minutes', label: 'Minimum booking notice (minutes)', max: 10080 },
            { key: 'buffer_minutes', label: 'Break between lessons (minutes)', max: 120 },
            {
              key: 'credit_return_hours',
              label: 'Credit returned with this much notice (hours)',
              max: 720,
            },
          ] as const
        ).map((field) => (
          <label className="ll-field" key={field.key}>
            <span>{field.label}</span>
            <input
              type="number"
              required
              min={0}
              max={field.max}
              value={draft[field.key]}
              onChange={(e) => setDraft({ ...draft, [field.key]: Number(e.target.value) })}
            />
          </label>
        ))}
        <label className="ll-field">
          <span>Student cancellation</span>
          <select
            value={draft.cancellation_hours === null ? 'disabled' : 'enabled'}
            onChange={(e) =>
              setDraft({ ...draft, cancellation_hours: e.target.value === 'disabled' ? null : 24 })
            }
          >
            <option value="disabled">Contact teacher to cancel</option>
            <option value="enabled">Allow cancellation before cutoff</option>
          </select>
        </label>
        {draft.cancellation_hours !== null && (
          <label className="ll-field">
            <span>Cancellation cutoff (hours)</span>
            <input
              type="number"
              min="0"
              max="720"
              required
              value={draft.cancellation_hours}
              onChange={(e) => setDraft({ ...draft, cancellation_hours: Number(e.target.value) })}
            />
            <small>
              Students can cancel or reschedule before this cutoff. The separate credit-return
              cutoff determines whether the original credit is returned.
            </small>
          </label>
        )}
      </div>
      <p className="text-sm my-4">
        New requests reserve a credit and require administrator approval. Missed lessons and late
        student cancellations use a credit. Teacher cancellations and rejected requests return the
        credit. Recording access uses each student’s course end and download deadline.
      </p>
      <button className="ll-button primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save rules'}
      </button>
      {message && (
        <p className="mt-3" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
export default function ProgramRules() {
  const { settings } = useLiveLearning();
  return (
    <section className="grid gap-6 mt-8">
      <BookingOperations />
      <VideoStorage />
      <BookingEmailSettings />
      <CourseAccessDates />
      {(Object.values(settings) as ProgramSettings[]).map((s) => (
        <React.Fragment key={`${s.program}:${JSON.stringify(s)}`}>
          <Rules initial={s} />
        </React.Fragment>
      ))}
    </section>
  );
}
