import React, { useState } from 'react';
import { Play } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

interface VideoPreviewProps {
  src: string;
  title: string;
  playLabel: string;
  poster?: string;
}

const focusPlayer = (frame: HTMLIFrameElement | null) => { frame?.focus(); };

/** Marketing previews load the external player only after a visitor presses play. */
export default function VideoPreview({ src, title, playLabel, poster }: VideoPreviewProps) {
  const [activeSource, setActiveSource] = useState<string>();
  const playing = activeSource === src;
  const playerUrl = new URL(src);
  playerUrl.searchParams.set('autoplay', '1');

  return (
    <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 bg-black">
      {playing ? (
        <iframe
          key={src}
          ref={focusPlayer}
          src={playerUrl.href}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          title={title}
        />
      ) : (
        <button
          type="button"
          onClick={() => setActiveSource(src)}
          aria-label={`${playLabel}: ${title}`}
          className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-950 to-purple-950 text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-purple-300 group"
        >
          {poster && (
            <OptimizedImage
              src={poster}
              alt=""
              loading="lazy"
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 600px, 100vw"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <span className="relative rounded-full bg-white/20 p-4 group-hover:bg-white/30 transition-colors">
            <Play size={28} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="relative text-sm font-bold">{playLabel}</span>
        </button>
      )}
    </div>
  );
}
