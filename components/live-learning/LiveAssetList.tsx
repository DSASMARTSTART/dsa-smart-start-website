import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Play, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { libraryApi, type LiveAsset } from './libraryApi';

function AssetViewer({ asset, onClose }: { asset: LiveAsset; onClose: () => void }) {
  const { t } = useTranslation('dashboard');
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    let disposed = false;
    setUrl('');
    setError('');
    libraryApi
      .open(asset)
      .then((value) => {
        if (!disposed) setUrl(value);
      })
      .catch((err) => {
        if (!disposed) setError(err.message);
      });
    return () => {
      disposed = true;
    };
  }, [asset, retry]);
  const mediaError = () => setError(t('live.playbackError'));
  return createPortal(
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClose={onClose}
      aria-label={asset.title}
      className="fixed m-auto w-[min(960px,94vw)] max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#101014] p-5 text-white shadow-2xl backdrop:bg-black/85"
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="font-bold text-lg break-words">{asset.title}</h2>
        <button
          type="button"
          autoFocus
          aria-label={t('live.closeFiles')}
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>
      {!url && !error && <p role="status">{t('live.loading')}</p>}
      {error && (
        <p role="alert" className="text-red-300 mb-4">
          {error}{' '}
          <button className="underline" onClick={() => setRetry((value) => value + 1)}>
            {t('live.retry')}
          </button>
        </p>
      )}
      {url && (
        <>
          {asset.provider === 'vimeo' ? (
            <iframe
              title={asset.title}
              src={url}
              className="w-full aspect-video rounded-xl bg-black"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : asset.mime_type.startsWith('video/') ? (
            <video
              key={url}
              className="w-full max-h-[65vh] rounded-xl bg-black"
              src={url}
              controls
              playsInline
              preload="metadata"
              onError={mediaError}
            />
          ) : asset.mime_type.startsWith('audio/') ? (
            <audio src={url} controls className="w-full" onError={mediaError} />
          ) : asset.mime_type.startsWith('image/') ? (
            <img src={url} alt={asset.title} className="max-h-[65vh] mx-auto object-contain" />
          ) : asset.mime_type === 'application/pdf' ? (
            <iframe title={asset.title} src={url} className="w-full h-[60vh] bg-white rounded-xl" />
          ) : (
            <p className="text-gray-300">{asset.filename}</p>
          )}
          {asset.kind === 'material' && (
            <a
              className="inline-flex items-center gap-2 text-purple-300 mt-5"
              href={url}
              download={asset.filename}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={17} />
              {t('live.downloadFile')}
            </a>
          )}
        </>
      )}
    </dialog>,
    document.body
  );
}

export default function LiveAssetList({
  assets,
  manager = false,
  onChanged,
}: {
  assets: LiveAsset[];
  manager?: boolean;
  onChanged?: () => Promise<void>;
}) {
  const { t } = useTranslation('dashboard');
  const [active, setActive] = useState<LiveAsset | null>(null),
    [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="grid gap-3 mt-4">
      {error && (
        <p role="alert" className="text-red-300 text-sm">
          {error}
        </p>
      )}
      {assets.map((asset) => (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4" key={asset.id}>
          <div className="flex items-center gap-3">
            <span className="text-purple-300">
              {asset.kind === 'recording' ? <Play size={19} /> : <FileText size={19} />}
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!!asset.state && asset.state !== 'ready'}
                onClick={() => setActive(asset)}
                className="text-left font-medium text-white hover:text-purple-200 break-words"
              >
                {asset.title}
              </button>
              {asset.state && asset.state !== 'ready' && (
                <p className="mt-1 text-xs text-amber-200">
                  {t(
                    asset.state === 'error'
                      ? 'live.vimeoFailed'
                      : asset.state === 'uploading'
                        ? 'live.vimeoUploading'
                        : 'live.vimeoProcessing'
                  )}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {asset.filename} · {(asset.byte_size / 1024 ** 2).toFixed(1)} MB
              </p>
            </div>
            {manager && (
              <button
                type="button"
                aria-label={`${t('live.removeFile')}: ${asset.title}`}
                className="p-2 text-gray-400 hover:text-red-300"
                onClick={() => setRemoving(asset.id)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {removing === asset.id && (
            <div className="mt-4 text-sm">
              <p className="text-gray-300">{t('live.removeFileConfirm')}</p>
              <div className="flex gap-4 mt-3">
                <button
                  disabled={busy}
                  className="text-red-300"
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    try {
                      await libraryApi.remove(asset);
                      setRemoving(null);
                    } catch (err) {
                      setError((err as Error).message);
                    } finally {
                      await onChanged?.();
                      setBusy(false);
                    }
                  }}
                >
                  {t('live.removeFile')}
                </button>
                <button disabled={busy} onClick={() => setRemoving(null)}>
                  {t('live.keepFile')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      {active && <AssetViewer asset={active} onClose={() => setActive(null)} />}
    </div>
  );
}
