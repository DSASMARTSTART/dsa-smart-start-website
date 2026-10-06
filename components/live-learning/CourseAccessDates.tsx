import React, { useEffect, useState } from 'react';
import { supabaseAny as db } from '../../lib/supabase';
type Terms = {
  id: string;
  student: string;
  course: string;
  status: string;
  courseEndsAt: string | null;
  downloadsUntil: string | null;
};
function localDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export default function CourseAccessDates() {
  const [rows, setRows] = useState<Terms[]>([]);
  const [selected, setSelected] = useState('');
  const [limited, setLimited] = useState(false);
  const [end, setEnd] = useState('');
  const [download, setDownload] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    db.rpc('live_enrollment_terms').then(
      ({ data, error }: { data: Terms[]; error: { message: string } | null }) => {
        if (disposed) return;
        if (error) setMessage(error.message);
        else setRows(data || []);
      }
    );
    return () => {
      disposed = true;
    };
  }, [retry]);
  return (
    <form
      className="ll-panel p-6 mt-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          const { error } = await db.rpc('save_live_course_terms', {
            p_enrollment: selected,
            p_end: limited ? new Date(end).toISOString() : null,
            p_download_until: limited ? new Date(download).toISOString() : null,
          });
          if (error) throw new Error(error.message);
          setMessage('Recording access saved.');
          setRetry((value) => value + 1);
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Student recording access</h3>
      <p className="text-sm text-gray-400 my-3">
        Students keep access to their purchased recordings while their account is active and their
        course access has not been revoked. To set a time limit, choose expiry dates below. Dates
        use {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </p>
      <label className="ll-field">
        <span>Student and package</span>
        <select
          required
          disabled={busy}
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            const row = rows.find((item) => item.id === event.target.value);
            setLimited(Boolean(row?.courseEndsAt));
            setEnd(localDate(row?.courseEndsAt || null));
            setDownload(localDate(row?.downloadsUntil || null));
            setMessage('');
          }}
        >
          <option value="">Choose a student package</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.student} · {row.course}
              {row.courseEndsAt ? '' : ' · ongoing access'}
            </option>
          ))}
        </select>
      </label>
      <label className="ll-field mt-4">
        <span>Access duration</span>
        <select
          disabled={busy || !selected}
          value={limited ? 'limited' : 'ongoing'}
          onChange={(event) => setLimited(event.target.value === 'limited')}
        >
          <option value="ongoing">While account remains active</option>
          <option value="limited">Set expiry dates</option>
        </select>
      </label>
      {limited && (
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <label className="ll-field">
            <span>Course ends</span>
            <input
              required
              disabled={busy}
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label className="ll-field">
            <span>Downloads available until</span>
            <input
              required
              disabled={busy}
              type="datetime-local"
              min={end}
              value={download}
              onChange={(event) => setDownload(event.target.value)}
            />
          </label>
        </div>
      )}
      <button disabled={busy || !selected} className="ll-button primary mt-4">
        {busy ? 'Saving…' : 'Save recording access'}
      </button>
      {message && (
        <p role="status" className="mt-3">
          {message}
        </p>
      )}
    </form>
  );
}
