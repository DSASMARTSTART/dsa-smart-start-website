import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { libraryApi, validateLiveFile, type UploadTarget } from './libraryApi';

export default function LiveAssetUpload({
  target,
  onDone,
}: {
  target: UploadTarget;
  onDone: () => void | Promise<void>;
}) {
  const { t } = useTranslation('dashboard');
  const [expanded, setExpanded] = useState(false),
    [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  const [error, setError] = useState(''),
    [success, setSuccess] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [vimeoReady, setVimeoReady] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  useEffect(() => {
    if (!expanded || target.kind !== 'recording') return;
    let disposed = false;
    setVimeoReady(false);
    libraryApi
      .vimeoStatus()
      .then((result) => {
        if (!disposed) {
          setVimeoReady(result.configured);
          setError(result.configured ? '' : t('live.vimeoNotConfigured'));
        }
      })
      .catch((err) => {
        if (!disposed) setError(err.message);
      });
    return () => {
      disposed = true;
    };
  }, [expanded, target.kind, connectionRetry, t]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [busy]);
  return (
    <div className="mt-4">
      {success && (
        <p role="status" className="text-emerald-300 text-sm mb-3">
          {t(target.kind === 'recording' ? 'live.vimeoUploaded' : 'live.filesUploaded')}
        </p>
      )}
      {!expanded ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-purple-200 text-sm"
          onClick={() => {
            setExpanded(true);
            setSuccess(false);
          }}
        >
          <UploadCloud size={17} />
          {t(target.kind === 'recording' ? 'live.uploadRecording' : 'live.uploadMaterial')}
        </button>
      ) : (
        <form
          className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file || busy || (target.kind === 'recording' && !vimeoReady)) return;
            setBusy(true);
            setError('');
            setProgress(0);
            controller.current = new AbortController();
            try {
              await libraryApi.upload(target, title, file, setProgress, controller.current.signal);
              setSuccess(true);
              setExpanded(false);
              setFile(null);
              setTitle('');
              await onDone();
            } catch (err) {
              if (!(err instanceof DOMException && err.name === 'AbortError'))
                setError(err instanceof Error ? err.message : t('live.errorBody'));
            } finally {
              setBusy(false);
              controller.current = null;
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <strong>
              {t(target.kind === 'recording' ? 'live.uploadRecording' : 'live.uploadMaterial')}
            </strong>
            <button
              type="button"
              aria-label={t('live.closeFiles')}
              disabled={busy}
              onClick={() => setExpanded(false)}
            >
              <X size={18} />
            </button>
          </div>
          <label className="grid gap-2 text-sm">
            {t('live.fileTitle')}
            <input
              className="rounded-xl bg-black/30 border border-white/15 p-3"
              value={title}
              maxLength={200}
              required
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm">
            {t('live.chooseFile')}
            <input
              type="file"
              className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-2 file:text-purple-200"
              required
              disabled={busy}
              accept={
                target.kind === 'recording'
                  ? '.mp4,.mov,.webm'
                  : '.pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,.txt'
              }
              onChange={(e) => {
                setError('');
                const next = e.target.files?.[0];
                setFile(null);
                if (next) {
                  try {
                    validateLiveFile(next, target.kind);
                    setFile(next);
                    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ''));
                  } catch (err) {
                    setError((err as Error).message);
                    e.target.value = '';
                  }
                }
              }}
            />
          </label>
          <p className="text-xs text-gray-400">
            {t(
              target.kind === 'recording' ? 'live.recordingUploadHelp' : 'live.materialUploadHelp'
            )}
          </p>
          {busy && (
            <div role="status">
              <progress
                aria-label={t('live.uploadProgress')}
                className="w-full accent-purple-500"
                value={progress}
                max={100}
              />
              <p className="text-sm text-purple-200">
                {progress}% · {t('live.keepUploadOpen')}
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-300 break-words">
              {error}
            </p>
          )}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={
                busy || !file || !title.trim() || (target.kind === 'recording' && !vimeoReady)
              }
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm disabled:opacity-50"
            >
              {t(busy ? 'live.uploadingFile' : 'live.publishFile')}
            </button>
            {target.kind === 'recording' && !vimeoReady && (
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setConnectionRetry((value) => value + 1)}
              >
                {t('live.retry')}
              </button>
            )}
            {busy && (
              <button
                type="button"
                className="text-sm text-gray-400"
                onClick={() => controller.current?.abort()}
              >
                {t('live.cancelUpload')}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
