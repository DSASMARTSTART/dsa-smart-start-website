import React, { useEffect, useState } from 'react';
import { supabaseAny as db } from '../../lib/supabase';
type Report = {
  recordingBytes: number;
  managedBytes: number;
  cleanup: { id: string; title: string; byte_size: number; delete_pending: boolean }[];
};
export default function VideoStorage() {
  const [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    db.rpc('live_storage_report').then(({ data, error }: { data: Report; error: Error | null }) => {
      if (disposed) return;
      if (error) setError(error.message);
      else setReport(data);
    });
    return () => {
      disposed = true;
    };
  }, [retry]);
  return (
    <section className="ll-panel p-6 space-y-4">
      <h3>Video storage & cleanup</h3>
      {report && (
        <>
          <p>
            Tracked uploads:{' '}
            {((Number(report.recordingBytes) + Number(report.managedBytes)) / 1e9).toFixed(2)} GB.
            Vimeo account usage also includes videos uploaded outside Eduway.
          </p>
          <p>
            Cleanup only includes expired recordings with no outstanding participant access, or
            failed uploads older than two days. Recordings with ongoing student access are kept.
          </p>
          {report.cleanup.length === 0 ? (
            <p>No recordings eligible for cleanup.</p>
          ) : (
            <>
              <ul>
                {report.cleanup.slice(0, 10).map((v) => (
                  <li key={v.id}>
                    {v.title} · {(v.byte_size / 1e9).toFixed(2)} GB{' '}
                    {v.delete_pending ? '· retry needed' : ''}
                  </li>
                ))}
              </ul>
              <button
                className="ll-button secondary"
                disabled={busy}
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Permanently delete these displayed recordings from Vimeo? This frees video storage and cannot be undone.'
                    )
                  )
                    return;
                  setBusy(true);
                  setError('');
                  try {
                    const { data, error } = await db.functions.invoke('live-vimeo', {
                      body: {
                        action: 'cleanup',
                        assetIds: report.cleanup.slice(0, 10).map((v) => v.id),
                      },
                    });
                    if (error || data?.error) throw new Error(data?.error || error.message);
                    setError(
                      data.results
                        .filter((r: { error?: string }) => r.error)
                        .map((r: { error: string }) => r.error)
                        .join(' ')
                    );
                    setRetry((n) => n + 1);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete displayed expired videos
              </button>
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        className="ll-button secondary"
        disabled={busy}
        onClick={() => setRetry((n) => n + 1)}
      >
        Refresh storage
      </button>
      <a
        href="https://vimeo.com/manage/videos"
        target="_blank"
        rel="noreferrer"
        className="block underline"
      >
        Open Vimeo storage and bandwidth reports
      </a>
    </section>
  );
}
