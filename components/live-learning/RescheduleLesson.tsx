import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { liveApi, type Availability } from './api';
import { useLiveLearning } from './LiveLearningContext';
import type { Booking } from './model';

export default function RescheduleLesson({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const { refresh } = useLiveLearning();
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(booking.date);
  const [slot, setSlot] = useState('');
  const [available, setAvailable] = useState<Availability>({ times: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let disposed = false;
    setSlot('');
    setLoading(true);
    setError('');
    liveApi
      .availability(booking.courseId, booking.teacherId, date, booking.id)
      .then((value) => {
        if (!disposed) setAvailable(value);
      })
      .catch((err: Error) => {
        if (!disposed) {
          setError(err.message);
          setAvailable({ times: [], groups: [] });
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [booking, date, retry]);
  const options =
    booking.kind === 'private'
      ? available.times
          .filter((time) => date !== booking.date || time !== booking.start)
          .map((time) => ({ id: time, label: time }))
      : available.groups
          .filter((group) => group.id !== booking.groupId)
          .map((group) => ({
            id: group.id,
            label: `${group.date} · ${group.start} · ${group.title}`,
          }));
  return createPortal(
    <dialog
      ref={dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      className="fixed m-auto w-[min(560px,94vw)] max-h-[90vh] overflow-auto rounded-3xl border border-white/15 bg-[#101014] p-6 text-white backdrop:bg-black/85"
      aria-labelledby="reschedule-title"
    >
      <h2 id="reschedule-title" className="text-xl font-bold">
        {t('live.reschedule')}
      </h2>
      <p className="text-sm text-gray-300 mt-3">{t('live.rescheduleHelp')}</p>
      <p className="mt-3 text-sm text-amber-200">
        {t(
          booking.rescheduleReturnsCredit
            ? 'live.rescheduleCreditReturned'
            : 'live.rescheduleCreditUsed'
        )}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || loading || !options.some((option) => option.id === slot)) return;
          setBusy(true);
          setError('');
          try {
            await liveApi.reschedule(
              booking.id,
              date,
              booking.kind === 'private' ? slot : null,
              booking.kind === 'group' ? slot : null
            );
            await refresh();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block mt-5 text-sm">
          {t('live.rescheduleDate')} · {booking.timezone}
          <input
            type="date"
            required
            value={date}
            disabled={busy}
            onChange={(event) => setDate(event.target.value)}
            className="block w-full rounded-lg bg-white/10 p-3 mt-2 [color-scheme:dark]"
          />
        </label>
        <label className="block mt-4 text-sm">
          {t('live.rescheduleSlot')}
          <select
            required
            value={slot}
            disabled={loading || busy}
            onChange={(event) => setSlot(event.target.value)}
            className="block w-full rounded-lg bg-[#24242b] p-3 mt-2"
          >
            <option value="">{t(loading ? 'live.loading' : 'live.chooseTime')}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!loading && !options.length && <p className="mt-3 text-gray-400">{t('live.noTimes')}</p>}
        {error && (
          <p role="alert" className="mt-3 text-red-300">
            {error}{' '}
            <button
              type="button"
              disabled={busy}
              onClick={() => setRetry((value) => value + 1)}
              className="underline"
            >
              {t('live.retry')}
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-4 mt-6">
          <button
            disabled={busy || loading || !slot}
            className="rounded-xl bg-purple-600 px-4 py-3 disabled:opacity-40"
          >
            {t(busy ? 'live.saving' : 'live.requestReschedule')}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            {t('live.keepLesson')}
          </button>
        </div>
      </form>
    </dialog>,
    document.body
  );
}
