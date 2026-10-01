import React, { useEffect, useState } from 'react';
import { libraryApi } from './libraryApi';
import { supabaseAny as db } from '../../lib/supabase';
import { useLiveLearning } from './LiveLearningContext';
export default function BookingOperations() {
  const { teachers } = useLiveLearning();
  const [vimeo, setVimeo] = useState<Awaited<ReturnType<typeof libraryApi.vimeoStatus>> | null>(
    null
  );
  const [mail, setMail] = useState<{
    queued: number;
    failed: number;
    oldestQueued: string | null;
  } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError('');
    Promise.all([libraryApi.vimeoStatus(), db.rpc('live_notification_health')])
      .then(([status, result]) => {
        if (disposed) return;
        setVimeo(status);
        if (result.error) throw new Error(result.error.message);
        setMail(result.data);
      })
      .catch((err: Error) => {
        if (!disposed) setError(err.message);
      });
    return () => {
      disposed = true;
    };
  }, [retry]);
  const unlinked = teachers.filter((teacher) => teacher.status === 'active' && !teacher.userId);
  return (
    <section className="ll-panel p-6 mt-6">
      <h3>Booking operations</h3>
      <div className="grid gap-3 mt-4 text-sm">
        {unlinked.length > 0 && (
          <p className="text-amber-200">
            {unlinked.length} active teacher profile(s) need a linked login before students can
            book. Open Teachers to invite the real teaching team.
          </p>
        )}
        {vimeo && (
          <p>
            Vimeo connection: {vimeo.configured ? 'Connected' : 'Not configured'}
            {vimeo.accountPlan ? ` · ${vimeo.accountPlan}` : ''}.
          </p>
        )}
        {vimeo?.downloadsSupported === false && (
          <p className="text-amber-200">
            Student recording downloads require a Vimeo plan with API file access, such as Standard.
            Upload and playback availability is separate.
          </p>
        )}
        {vimeo?.storage && vimeo.storage.max > 0 && (
          <p className={vimeo.storage.used / vimeo.storage.max > 0.8 ? 'text-amber-200' : ''}>
            Vimeo storage: {(vimeo.storage.used / 1e9).toFixed(1)} /{' '}
            {(vimeo.storage.max / 1e9).toFixed(1)} GB.{' '}
            {vimeo.storage.used / vimeo.storage.max > 0.8
              ? 'Storage is over 80% used. Review cleanup or account capacity.'
              : ''}
          </p>
        )}
        {mail && (
          <p>
            Email updates awaiting delivery: {mail.queued}. Failed after retries: {mail.failed}.
            {mail.oldestQueued &&
              ` Oldest queued: ${new Date(mail.oldestQueued).toLocaleString()}.`}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        className="ll-button secondary mt-4"
        onClick={() => setRetry((value) => value + 1)}
      >
        Refresh delivery and Vimeo status
      </button>
    </section>
  );
}
