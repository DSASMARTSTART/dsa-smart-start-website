import React, { useEffect, useState } from 'react';
import { supabaseAny as db } from '../../lib/supabase';
import { useLiveLearning } from './LiveLearningContext';
import type { Availability } from './api';
type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  program: string;
  student: string;
  course: string;
  privateCredits: number;
  groupCredits: number;
  privateUsed: number;
  groupUsed: number;
};
async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export default function StaffOperations() {
  const { teachers, bookings, refresh } = useLiveLearning();
  const [rows, setRows] = useState<Enrollment[]>([]),
    [enrollment, setEnrollment] = useState(''),
    [original, setOriginal] = useState(''),
    [teacher, setTeacher] = useState(''),
    [date, setDate] = useState(''),
    [slot, setSlot] = useState(''),
    [kind, setKind] = useState('private'),
    [reason, setReason] = useState(''),
    [refund, setRefund] = useState(true),
    [moveTime, setMoveTime] = useState('10:00'),
    [amount, setAmount] = useState(1),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [retry, setRetry] = useState(0),
    [available, setAvailable] = useState<Availability>({ times: [], groups: [] }),
    [loadingSlots, setLoadingSlots] = useState(false);
  const selected = rows.find((r) => r.id === enrollment);
  useEffect(() => {
    let disposed = false;
    rpc<Enrollment[]>('staff_live_enrollments')
      .then((data) => {
        if (!disposed) setRows(data);
      })
      .catch((e) => {
        if (!disposed) setMessage(e.message);
      });
    return () => {
      disposed = true;
    };
  }, [retry]);
  useEffect(() => {
    let disposed = false;
    setSlot('');
    setAvailable({ times: [], groups: [] });
    if (!enrollment || !teacher || !date) {
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    rpc<Availability>('staff_live_availability', {
      p_enrollment: enrollment,
      p_teacher: teacher,
      p_date: date,
      p_original: original || null,
    })
      .then((data) => {
        if (!disposed) setAvailable(data);
      })
      .catch((e) => {
        if (!disposed) setMessage(e.message);
      })
      .finally(() => {
        if (!disposed) setLoadingSlots(false);
      });
    return () => {
      disposed = true;
    };
  }, [enrollment, teacher, date, original, retry]);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      await action();
      await refresh();
      setRetry((n) => n + 1);
      setMessage(success);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const own = bookings.filter(
    (b) =>
      b.userId === selected?.userId &&
      b.courseId === selected?.courseId &&
      ['pending', 'booked'].includes(b.status) &&
      Date.parse(b.startsAt) > Date.now()
  );
  return (
    <section className="ll-panel p-6 space-y-5">
      <h2>Student booking support</h2>
      <p>
        Create a pending request or move a reservation. Availability, course access and credit
        checks apply to every change. Approve the resulting request separately.
      </p>
      <label className="ll-field">
        Student package
        <select
          disabled={busy}
          value={enrollment}
          onChange={(e) => {
            setEnrollment(e.target.value);
            setOriginal('');
            setTeacher('');
            setSlot('');
          }}
        >
          <option value="">Choose a student package</option>
          {rows.map((r) => (
            <option value={r.id} key={r.id}>
              {r.student} · {r.course}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <>
          <p>
            Private credits: {selected.privateCredits - selected.privateUsed} remaining of{' '}
            {selected.privateCredits}. Group credits: {selected.groupCredits - selected.groupUsed}{' '}
            remaining of {selected.groupCredits}.
          </p>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  rpc('staff_live_booking', {
                    p_enrollment: enrollment,
                    p_teacher: teacher,
                    p_date: date,
                    p_time: kind === 'private' ? slot : null,
                    p_group: kind === 'group' ? slot : null,
                    p_original: original || null,
                    p_reason: reason,
                    p_return_credit: refund,
                  }),
                'Pending request saved. Open Pending requests to approve.'
              );
            }}
          >
            <label className="ll-field">
              Action
              <select
                value={original}
                disabled={busy}
                onChange={(e) => {
                  setOriginal(e.target.value);
                  const b = own.find((b) => b.id === e.target.value);
                  if (b) {
                    setTeacher(b.teacherId);
                    setKind(b.kind);
                    setDate(b.date);
                  }
                }}
              >
                <option value="">Create a new booking</option>
                {own.map((b) => (
                  <option key={b.id} value={b.id}>
                    Move: {b.title} · {b.date} {b.start}
                  </option>
                ))}
              </select>
            </label>
            <label className="ll-field">
              Teacher
              <select
                required
                disabled={busy}
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">Choose teacher</option>
                {teachers
                  .filter(
                    (t) =>
                      t.status === 'active' && t.userId && t.programs.includes(selected.program)
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.timezone}
                    </option>
                  ))}
              </select>
            </label>
            <label className="ll-field">
              Lesson type
              <select
                disabled={busy || !!original}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setSlot('');
                }}
              >
                <option value="private">Private</option>
                <option value="group">Group</option>
              </select>
            </label>
            <label className="ll-field">
              Date in teacher's time zone
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="ll-field">
              Available slot
              <select
                required
                value={slot}
                disabled={busy || loadingSlots}
                onChange={(e) => setSlot(e.target.value)}
              >
                <option value="">
                  {loadingSlots ? 'Checking availability…' : 'Choose a slot'}
                </option>
                {kind === 'private'
                  ? available.times.map((t) => <option key={t}>{t}</option>)
                  : available.groups
                      .filter((g) => g.date === date)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.start} · {g.title} · {g.seats} seats
                        </option>
                      ))}
              </select>
            </label>
            {original && (
              <label>
                <input
                  type="checkbox"
                  checked={refund}
                  onChange={(e) => setRefund(e.target.checked)}
                  disabled={busy}
                />{' '}
                Return the original credit (teacher/admin change). Uncheck for a charged late
                student change.
              </label>
            )}
            <label className="ll-field">
              Reason
              <input
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
            </label>
            <button className="ll-button primary" disabled={busy || loadingSlots || !slot}>
              Save pending booking
            </button>
          </form>
          <form
            className="grid gap-3 border-t pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  rpc('adjust_live_credits', {
                    p_enrollment: enrollment,
                    p_kind: kind,
                    p_amount: amount,
                    p_reason: reason,
                  }),
                'Credit adjustment recorded.'
              );
            }}
          >
            <h3>Adjust lesson credits</h3>
            <p>
              Uses the lesson type and reason above. Positive numbers add credits; negative numbers
              remove unused credits.
            </p>
            <label className="ll-field">
              Adjustment
              <input
                type="number"
                min={-1000}
                max={1000}
                required
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            <button
              className="ll-button secondary"
              disabled={busy || !amount || reason.trim().length < 3}
            >
              Record credit adjustment
            </button>
          </form>
          {original && own.find((b) => b.id === original)?.groupId && (
            <div className="grid gap-3 border-t pt-4">
              <h3>Move the entire group</h3>
              <p>
                Uses the date and reason above. All attendees move together with their current
                teacher, and their original credits are returned. Every replacement needs approval.
              </p>
              <label className="ll-field">
                New group time
                <input type="time" value={moveTime} onChange={(e) => setMoveTime(e.target.value)} />
              </label>
              <button
                type="button"
                className="ll-button secondary"
                disabled={busy || !date || reason.trim().length < 3}
                onClick={() => {
                  const b = own.find((b) => b.id === original)!;
                  if (window.confirm('Move all attendees to this date and time?'))
                    void run(
                      () =>
                        rpc('reschedule_live_group', {
                          p_teacher: b.teacherId,
                          p_group: b.groupId,
                          p_date: date,
                          p_time: moveTime,
                          p_reason: reason,
                        }),
                      'Entire group moved. Review the new pending requests.'
                    );
                }}
              >
                Move whole group
              </button>
            </div>
          )}
          {original && own.find((b) => b.id === original)?.groupId && (
            <button
              className="ll-button secondary"
              disabled={busy || reason.trim().length < 3}
              onClick={() => {
                const b = own.find((b) => b.id === original)!;
                if (
                  window.confirm(
                    'Cancel this entire group session and return every reserved credit?'
                  )
                )
                  void run(
                    () =>
                      rpc('cancel_live_group', {
                        p_teacher: b.teacherId,
                        p_group: b.groupId,
                        p_reason: reason,
                      }),
                    'Group session cancelled; credits returned.'
                  );
              }}
            >
              Cancel whole group session
            </button>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
