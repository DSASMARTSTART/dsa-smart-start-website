import React, { useState } from 'react';
import { CalendarDays, Video, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveLearning } from './LiveLearningContext';
import type { Booking } from './model';
import { useLiveLibrary } from './useLiveLibrary';
import LiveAssetList from './LiveAssetList';
import LiveAssetUpload from './LiveAssetUpload';
export default function LessonList({
  manager = false,
  teacherId,
  courseId,
  initialHistory = false,
  view,
}: {
  manager?: boolean;
  teacherId?: string;
  courseId?: string;
  initialHistory?: boolean;
  view?: 'upcoming' | 'history';
}) {
  const { user } = useAuth();
  const { bookings, teachers, updateBooking } = useLiveLearning();
  const { t } = useTranslation('dashboard');
  const {
    assets,
    loading: filesLoading,
    error: filesError,
    refresh: refreshFiles,
  } = useLiveLibrary(courseId);
  const [missingOnly, setMissingOnly] = useState(false);
  const [history, setHistory] = useState(initialHistory),
    [pending, setPending] = useState<Booking | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const relevant = bookings.filter(
    (b) =>
      (manager || b.userId === user?.id) &&
      (!teacherId || b.teacherId === teacherId) &&
      (!courseId || b.courseId === courseId)
  );
  const recordingsFor = (b: Booking) =>
    assets.filter(
      (a) =>
        a.kind === 'recording' &&
        (a.booking_id === b.id ||
          (a.group_id && a.group_id === b.groupId && a.teacher_id === b.teacherId))
    );
  const needsRecording = (b: Booking) =>
    b.status !== 'cancelled' &&
    new Date(b.endsAt).getTime() <= Date.now() &&
    !b.recording &&
    !recordingsFor(b).some((a) => a.state !== 'error');
  const missingCount = new Set(relevant.filter(needsRecording).map((b) => b.groupId || b.id)).size;
  if (!relevant.length && !manager && !view) return null;
  const showHistory = view ? view === 'history' : history;
  const visible = relevant
    .filter((b) =>
      missingOnly
        ? needsRecording(b)
        : showHistory
          ? b.status !== 'booked' || new Date(b.endsAt).getTime() <= Date.now()
          : b.status === 'booked' && new Date(b.endsAt).getTime() > Date.now()
    )
    .sort((a, b) =>
      showHistory
        ? Date.parse(b.startsAt) - Date.parse(a.startsAt)
        : Date.parse(a.startsAt) - Date.parse(b.startsAt)
    );
  async function change(booking: Booking, action: 'cancel' | 'completed' | 'no_show') {
    setBusy(true);
    setError('');
    try {
      await updateBooking(booking.id, action);
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('live.errorBody'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="flex items-center gap-2 font-bold text-xl">
          <CalendarDays size={21} />
          {t(view ? (showHistory ? 'live.hub.history' : 'live.hub.upcoming') : 'live.myLessons')}
        </h2>
        {!view && (
          <button
            className="text-purple-300 text-sm"
            onClick={() => {
              setHistory(!history);
              setMissingOnly(false);
            }}
          >
            {t(history ? 'live.upcoming' : 'live.pastLessons')}
          </button>
        )}
      </div>
      {manager && !filesLoading && !filesError && missingCount > 0 && (
        <button
          type="button"
          aria-pressed={missingOnly}
          className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          onClick={() => {
            setMissingOnly(!missingOnly);
            setHistory(true);
          }}
        >
          {t('live.recordingsMissing', { count: missingCount })}
        </button>
      )}
      {filesError && (
        <p role="alert" className="text-red-300 mb-4">
          {filesError}{' '}
          <button className="underline" onClick={() => void refreshFiles()}>
            {t('live.retry')}
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-300 mb-4">
          {error}
        </p>
      )}
      {!visible.length && (
        <p className="text-gray-400">
          {t(showHistory ? 'live.hub.emptyHistory' : 'live.hub.emptyUpcoming')}
        </p>
      )}
      <div className="grid gap-4">
        {visible.map((b) => (
          <article className="rounded-2xl border border-white/10 p-5" key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{b.title}</h3>
                <p className="text-sm text-gray-400 mt-2">
                  {teachers.find((x) => x.id === b.teacherId)?.name} ·{' '}
                  {t(b.kind === 'group' ? 'live.group' : 'live.private')}
                </p>
                <p className="text-sm mt-2">
                  {new Date(b.startsAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  · {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                {manager && <p className="text-sm text-purple-300 mt-2">{b.studentName}</p>}
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300">
                {t(`live.status_${b.status}`)}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-5">
              {b.status === 'booked' && Date.parse(b.endsAt) > Date.now() && b.zoom && (
                <a
                  className="inline-flex items-center gap-2 text-purple-300"
                  href={b.zoom}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Video size={16} />
                  {t('live.joinLesson')}
                </a>
              )}
              {b.status !== 'cancelled' && b.recording && (
                <a
                  className="inline-flex items-center gap-2 text-purple-300"
                  href={b.recording}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  {t('live.watchRecording')}
                </a>
              )}
              {b.canCancel && (
                <button disabled={busy} className="text-gray-400" onClick={() => setPending(b)}>
                  {t('live.cancelLesson')}
                </button>
              )}
              {manager && b.status === 'booked' && new Date(b.startsAt).getTime() < Date.now() && (
                <>
                  <button disabled={busy} onClick={() => void change(b, 'completed')}>
                    Mark attended
                  </button>
                  <button disabled={busy} onClick={() => void change(b, 'no_show')}>
                    Mark no-show
                  </button>
                </>
              )}
            </div>
            {b.status !== 'cancelled' && new Date(b.endsAt).getTime() <= Date.now() && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <h4 className="text-sm font-semibold text-purple-200">
                  {t('live.lessonRecordings')}
                </h4>
                {b.kind === 'group' && manager && (
                  <p className="mt-2 text-xs text-gray-400">{t('live.groupRecordingHelp')}</p>
                )}
                <LiveAssetList
                  assets={recordingsFor(b)}
                  manager={manager}
                  onChanged={refreshFiles}
                />
                {!filesLoading && !filesError && !b.recording && !recordingsFor(b).length && (
                  <p className="text-sm text-gray-500 mt-3">
                    {t(manager ? 'live.recordingNeeded' : 'live.recordingNotAvailable')}
                  </p>
                )}
                {manager && (
                  <LiveAssetUpload
                    target={{ kind: 'recording', bookingId: b.id }}
                    onDone={refreshFiles}
                  />
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-lesson-heading"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6"
        >
          <div className="max-w-md rounded-3xl border border-white/10 bg-[#111] p-8">
            <h3 id="cancel-lesson-heading" className="font-bold text-xl">
              {t('live.cancelLesson')}?
            </h3>
            <p className="text-gray-400 mt-4">{t('live.cancelExplanation')}</p>
            {error && (
              <p role="alert" className="text-red-300 mt-3">
                {error}
              </p>
            )}
            <div className="flex gap-4 mt-6">
              <button
                disabled={busy}
                className="rounded-xl bg-purple-600 px-4 py-3"
                onClick={() => void change(pending, 'cancel')}
              >
                {busy ? t('live.saving') : t('live.confirmCancel')}
              </button>
              <button disabled={busy} onClick={() => setPending(null)}>
                {t('live.keepLesson')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
