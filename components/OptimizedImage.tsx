import React, { useState } from 'react';
import images from '../data/displayImageManifest.json';

export type ImageEntry = {
  width: number;
  height: number;
  variants: { src: string; width: number }[];
};
const manifest: Record<string, ImageEntry> = images;

/** Responsive local assets, with ordinary image behavior for custom/remote URLs. */
export default function OptimizedImage({
  src,
  sizes,
  imageManifest = manifest,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { imageManifest?: Record<string, ImageEntry> }) {
  const [failedSource, setFailedSource] = useState<string>();
  const entry = src ? imageManifest[src] : undefined;
  const storagePrefix = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/course-images/`;
  const remote = src?.startsWith(storagePrefix) && failedSource !== src;
  const transformed = (width: number) => {
    const url = new URL(src!.replace('/object/public/', '/render/image/public/'));
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', '80');
    return url.href;
  };
  const unsplash = src?.startsWith('https://images.unsplash.com/') && failedSource !== src;
  const photoUrl = (width: number) => {
    const url = new URL(src!);
    url.searchParams.set('w', String(width));
    return url.href;
  };
  const responsive = failedSource !== src && entry;
  return (
    <img
      decoding="async"
      {...props}
      src={
        responsive
          ? entry.variants.at(-1)!.src
          : remote
            ? transformed(960)
            : unsplash
              ? photoUrl(960)
              : src
      }
      srcSet={
        responsive
          ? entry.variants.map((v) => `${v.src} ${v.width}w`).join(', ')
          : remote
            ? [320, 640, 960].map((w) => `${transformed(w)} ${w}w`).join(', ')
            : unsplash
              ? [320, 640, 960, 1280].map((w) => `${photoUrl(w)} ${w}w`).join(', ')
              : props.srcSet
      }
      sizes={
        responsive || remote || unsplash ? (sizes ?? '(max-width: 640px) 100vw, 400px') : sizes
      }
      width={props.width ?? entry?.width}
      height={props.height ?? entry?.height}
      onError={(event) => {
        if (responsive || remote || unsplash) setFailedSource(src);
        else props.onError?.(event);
      }}
    />
  );
}
