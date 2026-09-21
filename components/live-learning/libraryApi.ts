import { supabaseAny as db } from '../../lib/supabase';

export type LiveAsset = {
  id: string;
  kind: 'material' | 'recording';
  course_id: string;
  booking_id: string | null;
  teacher_id: string | null;
  group_id: string | null;
  title: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  provider: 'storage' | 'vimeo';
  state: 'uploading' | 'processing' | 'ready' | 'error' | 'removed';
  bucket: string | null;
  path: string | null;
  created_at: string;
};
export type LibraryCourse = {
  id: string;
  title: string;
  program: string;
  materialsIncluded: boolean;
  materialsOffered: boolean;
  canReadMaterials: boolean;
};
export type LiveLibrary = { assets: LiveAsset[]; courses: LibraryCourse[]; syncError?: string };
export type UploadTarget =
  { kind: 'material'; courseId: string } | { kind: 'recording'; bookingId: string };

const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  txt: 'text/plain',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};
export function validateLiveFile(file: File, kind: UploadTarget['kind']) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = mimeByExtension[extension];
  if (!mime || (kind === 'recording' ? !mime.startsWith('video/') : mime.startsWith('video/')))
    throw new Error(
      kind === 'recording'
        ? 'Choose an MP4, MOV or WebM video.'
        : 'Choose a PDF, DOCX, PPTX, XLSX, image, audio or TXT file.'
    );
  const limit = kind === 'recording' ? 5 * 1024 ** 3 : 50 * 1024 ** 2;
  if (!file.size || file.size > limit)
    throw new Error(
      kind === 'recording' ? 'Choose a video up to 5 GB.' : 'Choose a file up to 50 MB.'
    );
  return mime;
}
async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
async function vimeoRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.functions.invoke('live-vimeo', { body });
  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      if (details?.error) throw new Error(details.error);
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
export const libraryApi = {
  vimeoStatus: () => vimeoRequest<{ configured: boolean }>({ action: 'status' }),
  async list(courseId?: string, bookingId?: string) {
    const args = { p_course: courseId || null, p_booking: bookingId || null };
    const result = await rpc<LiveLibrary>('live_library', args);
    const pending = result.assets
      .filter((a) => a.provider === 'vimeo' && ['uploading', 'processing'].includes(a.state))
      .slice(0, 5);
    if (pending.length) {
      try {
        await vimeoRequest({ action: 'sync', assetIds: pending.map((a) => a.id) });
        return await rpc<LiveLibrary>('live_library', args);
      } catch (error) {
        result.syncError =
          error instanceof Error ? error.message : 'Could not check Vimeo processing.';
      }
    }
    return result;
  },
  async open(asset: LiveAsset) {
    if (asset.provider === 'vimeo')
      return (await vimeoRequest<{ url: string }>({ action: 'play', assetId: asset.id })).url;
    if (!asset.bucket || !asset.path) throw new Error('File location is missing.');
    const { data, error } = await db.storage.from(asset.bucket).createSignedUrl(asset.path, 300);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
  async remove(asset: LiveAsset) {
    if (asset.provider === 'vimeo') {
      await vimeoRequest({ action: 'remove', assetId: asset.id });
      return;
    }
    await rpc('remove_live_asset', { p_id: asset.id });
    if (!asset.bucket || !asset.path) return;
    const { error } = await db.storage.from(asset.bucket).remove([asset.path]);
    if (error)
      throw new Error(
        'The file is hidden from students, but storage cleanup failed. Please contact support.'
      );
  },
  async upload(
    target: UploadTarget,
    title: string,
    file: File,
    progress: (percent: number) => void,
    signal: AbortSignal
  ) {
    const mime = validateLiveFile(file, target.kind);
    let asset: LiveAsset;
    let uploadUrl: string | undefined;
    if (target.kind === 'recording') {
      const created = await vimeoRequest<{ asset: LiveAsset; uploadUrl: string }>({
        action: 'create',
        bookingId: target.bookingId,
        title,
        filename: file.name,
        mime,
        bytes: file.size,
      });
      asset = created.asset;
      uploadUrl = created.uploadUrl;
    } else {
      asset = await rpc<LiveAsset>('prepare_live_asset', {
        p_kind: 'material',
        p_course: target.courseId,
        p_booking: null,
        p_title: title,
        p_filename: file.name,
        p_mime: mime,
        p_bytes: file.size,
      });
    }
    let transferred = false;
    try {
      const { Upload } = await import('tus-js-client');
      const endpoint = new URL(import.meta.env.VITE_SUPABASE_URL);
      if (endpoint.hostname.endsWith('.supabase.co'))
        endpoint.hostname = endpoint.hostname.replace('.supabase.co', '.storage.supabase.co');
      endpoint.pathname = '/storage/v1/upload/resumable';
      await new Promise<void>((resolve, reject) => {
        const cancelled = () => new DOMException('Upload cancelled', 'AbortError');
        if (signal.aborted) {
          reject(cancelled());
          return;
        }
        const cleanup = () => signal.removeEventListener('abort', abort);
        const upload = new Upload(file, {
          ...(uploadUrl
            ? { uploadUrl }
            : {
                endpoint: endpoint.toString(),
                uploadDataDuringCreation: true,
                metadata: {
                  bucketName: asset.bucket!,
                  objectName: asset.path!,
                  contentType: mime,
                  cacheControl: '0',
                },
              }),
          chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: false,
          onBeforeRequest: async (request) => {
            // Vimeo receives only its single-upload capability URL, never either account token.
            if (uploadUrl) return;
            const {
              data: { session },
            } = await db.auth.getSession();
            if (!session) throw new Error('Sign in again before uploading.');
            request.setHeader('Authorization', `Bearer ${session.access_token}`);
          },
          onProgress: (sent, total) => progress(Math.min(99, Math.round((sent / total) * 100))),
          onError: (error) => {
            cleanup();
            reject(error);
          },
          onSuccess: () => {
            cleanup();
            resolve();
          },
        });
        const abort = () => {
          cleanup();
          void upload.abort().finally(() => reject(cancelled()));
        };
        signal.addEventListener('abort', abort, { once: true });
        upload.start();
      });
      if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
      transferred = true;
      if (asset.provider === 'vimeo') {
        // Processing is verified by the server; a browser can never mark a video ready.
        await vimeoRequest({ action: 'sync', assetIds: [asset.id] });
      } else await rpc('finish_live_asset', { p_id: asset.id });
      progress(100);
      return asset;
    } catch (error) {
      // Preserve a completed Vimeo transfer on a transient status-check failure.
      // The lesson library will retry processing checks, avoiding duplicate uploads.
      if (transferred && asset.provider === 'vimeo') {
        progress(100);
        return asset;
      }
      await libraryApi.remove(asset).catch(() => undefined);
      throw error;
    }
  },
};
