// This module runs only on the server. Never return the account token or raw API
// responses (which may include direct video files) to the frontend.
export type VimeoVideo = {
  uri: string;
  upload?: { status?: string; upload_link?: string; size?: number };
  transcode?: { status?: string };
  privacy?: { view?: string; embed?: string; download?: boolean };
  player_embed_url?: string;
};
export function approvedDomains(value: string) {
  const domains = [
    ...new Set(
      value
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (
    !domains.length ||
    domains.length > 10 ||
    domains.some((d) => !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(d))
  )
    throw new Error('Configure VIMEO_ALLOWED_DOMAINS with the platform hostnames.');
  return domains;
}
export function safeVimeoUploadUrl(value: string | undefined) {
  const url = new URL(value || '');
  if (
    url.protocol !== 'https:' ||
    !(url.hostname.endsWith('.vimeo.com') || url.hostname.endsWith('.vimeousercontent.com')) ||
    url.username ||
    url.password
  )
    throw new Error('Vimeo returned an invalid upload endpoint.');
  return url.toString();
}
export function safeVimeoEmbedUrl(value: string | undefined, uri: string) {
  if (!/^\/videos\/[0-9]+$/.test(uri)) throw new Error('Invalid Vimeo video identity.');
  const url = new URL(value || `https://player.vimeo.com/video/${uri.split('/').pop()}`);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'player.vimeo.com' ||
    url.pathname !== `/video/${uri.split('/').pop()}` ||
    url.username ||
    url.password
  )
    throw new Error('Vimeo returned an invalid player URL.');
  // Keep Vimeo's unlisted hash when present; do not pass arbitrary player options.
  const clean = new URL(url.origin + url.pathname);
  const hash = url.searchParams.get('h');
  if (hash) clean.searchParams.set('h', hash);
  clean.searchParams.set('dnt', '1');
  return clean.toString();
}
export function videoState(video: VimeoVideo): 'uploading' | 'processing' | 'ready' | 'error' {
  if (video.upload?.status === 'error' || video.transcode?.status === 'error') return 'error';
  if (video.upload?.status !== 'complete') return 'uploading';
  if (
    video.privacy?.view !== 'disable' ||
    video.privacy?.embed !== 'whitelist' ||
    video.privacy?.download !== false
  )
    return 'error';
  return video.transcode?.status === 'complete' ? 'ready' : 'processing';
}
export class VimeoClient {
  constructor(
    private token: string,
    private request: typeof fetch = fetch
  ) {}
  async api(path: string, method = 'GET', body?: unknown) {
    if (
      !/^\/(?:me(?:\/videos)?|videos\/[0-9]+(?:\/privacy\/domains(?:\/[a-zA-Z0-9.%_-]+)?)?)(?:\?.*)?$/.test(
        path
      )
    )
      throw new Error('Invalid Vimeo API path.');
    const response = await this.request(`https://api.vimeo.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      // No upstream response bodies: tokens and upload capabilities must stay private.
      if (response.status === 401 || response.status === 403)
        throw new Error(
          'Vimeo rejected access. Check the token scopes, API upload permission and privacy features of the account.'
        );
      if (response.status === 429)
        throw new Error('Vimeo is temporarily rate-limiting requests. Please try again later.');
      if (response.status === 404) throw new Error('The Vimeo video is no longer available.');
      throw new Error(
        `Vimeo request failed (${response.status}). Please retry or check the account upload quota.`
      );
    }
    return response.status === 204 ? null : response.json();
  }
  async create(title: string, bytes: number, domains: string[]): Promise<VimeoVideo> {
    const video: VimeoVideo = await this.api('/me/videos', 'POST', {
      name: title,
      upload: { approach: 'tus', size: bytes },
      privacy: { view: 'disable', embed: 'whitelist', download: false, add: false },
    });
    if (!/^\/videos\/[0-9]+$/.test(video.uri))
      throw new Error('Vimeo returned an invalid video identity.');
    try {
      for (const domain of domains)
        await this.api(`${video.uri}/privacy/domains/${encodeURIComponent(domain)}`, 'PUT');
      safeVimeoUploadUrl(video.upload?.upload_link);
      if (
        video.privacy?.view !== 'disable' ||
        video.privacy?.embed !== 'whitelist' ||
        video.privacy?.download !== false
      )
        throw new Error('Vimeo did not apply the required recording privacy settings.');
      return video;
    } catch (error) {
      await this.api(video.uri, 'DELETE').catch(() => undefined);
      throw error;
    }
  }
  get(uri: string): Promise<VimeoVideo> {
    return this.api(
      `${uri}?fields=uri,upload.status,upload.size,transcode.status,privacy,player_embed_url`
    );
  }
}
