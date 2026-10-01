import React, { useEffect, useRef, useState } from 'react';
import { supabaseAny as db } from '../../lib/supabase';
import { validateLiveFile } from './libraryApi';
type Video = { id: string; title: string; state: string; delete_pending: boolean };
type Target =
  | { teacherId: string; courseId?: never; lessonId?: never }
  | { teacherId?: never; courseId: string; lessonId: string };
async function request(body: Record<string, unknown>) {
  const { data, error } = await db.functions.invoke('live-vimeo', { body });
  if (error) {
    const details =
      error.context instanceof Response ? await error.context.json().catch(() => null) : null;
    throw new Error(details?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export default function ManagedVideo({
  target,
  manager = false,
  onReady,
}: {
  target: Target;
  manager?: boolean;
  onReady?: (url: string) => void | Promise<void>;
}) {
  const [videos, setVideos] = useState<Video[]>([]),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [playing, setPlaying] = useState('');
  const abort = useRef<(() => void) | null>(null);
  useEffect(() => {
    let disposed = false;
    async function load() {
      const { data, error } = await db.rpc('managed_video_list', {
        p_teacher: target.teacherId || null,
        p_course: target.courseId || null,
        p_lesson: target.lessonId || null,
      });
      if (!disposed) {
        if (error) setError(error.message);
        else setVideos(data || []);
      }
    }
    void load();
    return () => {
      disposed = true;
    };
  }, [target.teacherId, target.courseId, target.lessonId, retry]); // Primitive target fields define the request.
  const pendingKey = manager
    ? videos
        .filter((v) => ['uploading', 'processing'].includes(v.state))
        .slice(0, 3)
        .map((v) => v.id)
        .join(',')
    : '';
  useEffect(() => {
    if (!pendingKey || busy) return;
    let disposed = false;
    const timer = window.setTimeout(async () => {
      if (document.visibilityState === 'hidden') {
        if (!disposed) setRetry((n) => n + 1);
        return;
      }
      try {
        for (const id of pendingKey.split(','))
          await request({ action: 'media_sync', assetId: id });
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        if (!disposed) setRetry((n) => n + 1);
      }
    }, 15000);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [pendingKey, busy, retry]);
  useEffect(() => () => abort.current?.(), []);
  useEffect(() => {
    if (!busy) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [busy]);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await run();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRetry((n) => n + 1);
      setBusy(false);
    }
  }
  const latest = videos.find((v) => v.state === 'ready');
  return (
    <div className="grid gap-3 mt-4 min-w-0">
      {latest && (
        <button
          type="button"
          className="ll-button secondary small"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const result = await request({ action: 'media_play', assetId: latest.id });
              setPlaying(result.url);
            })
          }
        >
          {target.courseId ? 'Watch lesson' : 'Watch introduction'}
        </button>
      )}
      {playing && (
        <>
          <iframe
            className="w-full aspect-video rounded-xl"
            title="Video preview"
            src={playing}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <button type="button" onClick={() => setPlaying('')}>
            Close video
          </button>
        </>
      )}
      {manager && (
        <>
          <label className="ll-field">
            Upload {target.teacherId ? 'introduction' : 'lesson'} video
            <input
              type="file"
              accept=".mp4,.webm,.mov"
              disabled={busy}
              onChange={(e) => {
                setFile(null);
                setError('');
                const f = e.target.files?.[0];
                if (f)
                  try {
                    validateLiveFile(f, 'recording');
                    setFile(f);
                  } catch (err) {
                    setError((err as Error).message);
                  }
              }}
            />
          </label>
          <p className="text-sm">
            MP4, MOV or WebM, up to 5 GB. Keep this page open during upload. A new video appears
            after processing; remove the old version when the replacement is ready.
          </p>
          <button
            type="button"
            className="ll-button primary small"
            disabled={busy || !file}
            onClick={() =>
              void action(async () => {
                if (!file) return;
                setProgress(0);
                const { asset, uploadUrl } = await request({
                  action: 'media_create',
                  kind: target.teacherId ? 'introduction' : 'lesson',
                  ...target,
                  title: file.name.replace(/\.[^.]+$/, ''),
                  filename: file.name,
                  mime: validateLiveFile(file, 'recording'),
                  bytes: file.size,
                });
                try {
                  const { Upload } = await import('tus-js-client');
                  await new Promise<void>((resolve, reject) => {
                    const upload = new Upload(file, {
                      uploadUrl,
                      chunkSize: 6 * 1024 * 1024,
                      retryDelays: [0, 3000, 5000, 10000, 20000],
                      storeFingerprintForResuming: false,
                      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
                      onSuccess: () => resolve(),
                      onError: reject,
                    });
                    abort.current = () => {
                      void upload.abort();
                      reject(new Error('Upload cancelled.'));
                    };
                    upload.start();
                  });
                } catch (e) {
                  await request({ action: 'media_remove', assetId: asset.id }).catch(
                    () => undefined
                  );
                  throw e;
                } finally {
                  abort.current = null;
                }
                setFile(null);
                await request({ action: 'media_sync', assetId: asset.id });
              })
            }
          >
            {busy ? `Uploading / saving… ${progress}%` : 'Upload video'}
          </button>
          {videos.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                {v.title} · {v.state}
                {v.delete_pending ? ' · deletion needs retry' : ''}
              </span>
              {v.state !== 'removed' && (
                <button
                  type="button"
                  disabled={busy}
                  className="underline"
                  onClick={() =>
                    void action(async () => {
                      const result = await request({ action: 'media_sync', assetId: v.id });
                      if (result.state === 'ready') {
                        setPlaying(result.url);
                        if (onReady) await onReady(result.url);
                      }
                    })
                  }
                >
                  {onReady ? 'Check & use in lesson' : 'Check processing / preview'}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className="underline"
                onClick={() => {
                  if (window.confirm('Permanently delete this video from Vimeo?'))
                    void action(async () => {
                      await request({ action: 'media_remove', assetId: v.id });
                      setPlaying('');
                    });
                }}
              >
                Delete video
              </button>
            </div>
          ))}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-500">
          {error}{' '}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Refresh
          </button>
        </p>
      )}
    </div>
  );
}
