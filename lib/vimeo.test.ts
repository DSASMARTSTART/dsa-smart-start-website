import { describe, expect, it, vi } from 'vitest';
import {
  VimeoClient,
  approvedDomains,
  safeVimeoEmbedUrl,
  safeVimeoUploadUrl,
  videoState,
} from '../supabase/functions/live-vimeo/vimeo';
const privacy = { view: 'disable', embed: 'whitelist', download: false };
describe('Vimeo recording integration', () => {
  it('creates a resumable upload with protected playback and all configured domains', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uri: '/videos/123',
            privacy,
            upload: { upload_link: 'https://files.tus.vimeo.com/upload/test' },
          }),
          { status: 201 }
        )
      )
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new VimeoClient('test-token', request);
    await client.create('Lesson recording', 1234, ['eduway.academy', 'www.eduway.academy']);
    expect(request.mock.calls[0][0]).toBe('https://api.vimeo.com/me/videos');
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
      upload: { approach: 'tus', size: 1234 },
      privacy: { view: 'disable', embed: 'whitelist', download: false },
    });
    expect(request.mock.calls.slice(1).map((call) => call[0])).toEqual([
      'https://api.vimeo.com/videos/123/privacy/domains/eduway.academy',
      'https://api.vimeo.com/videos/123/privacy/domains/www.eduway.academy',
    ]);
  });
  it('does not publish before Vimeo finishes processing or with unsafe privacy', () => {
    expect(
      videoState({
        uri: '/videos/1',
        privacy,
        upload: { status: 'in_progress' },
        transcode: { status: 'complete' },
      })
    ).toBe('uploading');
    expect(
      videoState({
        uri: '/videos/1',
        privacy,
        upload: { status: 'complete' },
        transcode: { status: 'in_progress' },
      })
    ).toBe('processing');
    expect(
      videoState({
        uri: '/videos/1',
        privacy,
        upload: { status: 'complete' },
        transcode: { status: 'complete' },
      })
    ).toBe('ready');
    expect(
      videoState({
        uri: '/videos/1',
        privacy: { ...privacy, view: 'anybody' },
        upload: { status: 'complete' },
        transcode: { status: 'complete' },
      })
    ).toBe('error');
  });
  it('rejects unexpected upload and player domains', () => {
    expect(() => safeVimeoUploadUrl('https://vimeo.com.attacker.invalid/upload')).toThrow();
    expect(() => safeVimeoEmbedUrl('https://attacker.invalid/video/123', '/videos/123')).toThrow();
    expect(() => safeVimeoEmbedUrl('https://player.vimeo.com/video/456', '/videos/123')).toThrow();
    expect(
      safeVimeoEmbedUrl('https://player.vimeo.com/video/123?h=abc&autoplay=1', '/videos/123')
    ).toBe('https://player.vimeo.com/video/123?h=abc&dnt=1');
  });
  it('does not send requests to arbitrary API paths', async () => {
    const request = vi.fn();
    await expect(
      new VimeoClient('test-token', request).api('https://attacker.invalid')
    ).rejects.toThrow('Invalid Vimeo API path');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not expose upstream responses in errors', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response('secret-data-not-for-browser', { status: 403 }));
    await expect(new VimeoClient('test-token', request).get('/videos/123')).rejects.toThrow(
      'Vimeo rejected access'
    );
  });
  it('cleans up a new video when domain protection cannot be applied', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uri: '/videos/123',
            privacy,
            upload: { upload_link: 'https://files.tus.vimeo.com/test' },
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      new VimeoClient('test-token', request).create('Lesson', 10, ['eduway.academy'])
    ).rejects.toThrow('Vimeo rejected access');
    expect(request.mock.calls[2][1].method).toBe('DELETE');
  });
  it('validates hostnames and removes duplicates', () => {
    expect(approvedDomains('eduway.academy, www.eduway.academy,eduway.academy')).toEqual([
      'eduway.academy',
      'www.eduway.academy',
    ]);
    expect(() => approvedDomains('https://eduway.academy/path')).toThrow();
  });
});
