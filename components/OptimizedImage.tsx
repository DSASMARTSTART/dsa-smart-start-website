import React, { useState } from 'react';
import images from '../data/imageManifest.json';

type Entry = { width: number; height: number; variants: { src: string; width: number }[] };
const manifest: Record<string, Entry> = images;

/** Responsive local assets, with ordinary image behavior for custom/remote URLs. */
export default function OptimizedImage({
  src,
  sizes,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSource, setFailedSource] = useState<string>();
  const entry = src ? manifest[src] : undefined;
  const storagePrefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/course-images/`;
  const remote = src?.startsWith(storagePrefix) && failedSource !== src;
  const transformed = (width: number) => {
    const url = new URL(src!.replace('/object/public/', '/render/image/public/'));
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', '80');
    return url.href;
  };
  const responsive = failedSource !== src && entry;
  return (
    <img
      decoding="async"
      {...props}
      src={responsive ? entry.variants.at(-1)!.src : remote ? transformed(960) : src}
      srcSet={
        responsive
          ? entry.variants.map((v) => `${v.src} ${v.width}w`).join(', ')
          : remote
            ? [320, 640, 960].map((w) => `${transformed(w)} ${w}w`).join(', ')
            : props.srcSet
      }
      sizes={responsive || remote ? (sizes ?? '(max-width: 640px) 100vw, 400px') : sizes}
      width={props.width ?? entry?.width}
      height={props.height ?? entry?.height}
      onError={(event) => {
        if (responsive || remote) setFailedSource(src);
        else props.onError?.(event);
      }}
    />
  );
}
