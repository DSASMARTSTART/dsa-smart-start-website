import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const f = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  supabaseAny: { rpc: f.rpc, functions: { invoke: f.invoke } },
}));
import ManagedVideo from './ManagedVideo';
afterEach(cleanup);
beforeEach(() => {
  f.rpc
    .mockReset()
    .mockResolvedValue({
      data: [{ id: 'intro', title: 'Introduction', state: 'ready', delete_pending: false }],
      error: null,
    });
  f.invoke
    .mockReset()
    .mockResolvedValue({
      data: { state: 'ready', url: 'https://player.vimeo.com/video/123' },
      error: null,
    });
});
it('requests authorized playback and hides management controls from students', async () => {
  render(<ManagedVideo target={{ teacherId: 'teacher' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Watch introduction' }));
  expect((await screen.findByTitle('Video preview')).getAttribute('src')).toBe(
    'https://player.vimeo.com/video/123'
  );
  expect(f.invoke).toHaveBeenCalledWith('live-vimeo', {
    body: { action: 'media_play', assetId: 'intro' },
  });
  expect(screen.queryByText('Delete video')).toBeNull();
  expect(screen.queryByLabelText('Upload introduction video')).toBeNull();
});
it('only attaches a course video after Vimeo reports it ready', async () => {
  const ready = vi.fn();
  f.rpc.mockResolvedValue({
    data: [{ id: 'lesson', title: 'Lesson', state: 'processing', delete_pending: false }],
    error: null,
  });
  f.invoke.mockResolvedValue({ data: { state: 'processing' }, error: null });
  render(
    <ManagedVideo manager target={{ courseId: 'course', lessonId: 'lesson-id' }} onReady={ready} />
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Check & use in lesson' }));
  expect(ready).not.toHaveBeenCalled();
  f.invoke.mockResolvedValue({
    data: { state: 'ready', url: 'https://player.vimeo.com/video/456' },
    error: null,
  });
  await screen.findByRole('button', { name: 'Check & use in lesson' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(screen.getByRole('button', { name: 'Check & use in lesson' }));
  expect((await screen.findByTitle('Video preview')).getAttribute('src')).toBe(
    'https://player.vimeo.com/video/456'
  );
  expect(ready).toHaveBeenCalledWith('https://player.vimeo.com/video/456');
});
it('shows authorization failures instead of embedding an unavailable video', async () => {
  f.invoke.mockResolvedValue({
    data: { error: 'Video unavailable to this account.' },
    error: null,
  });
  render(<ManagedVideo target={{ teacherId: 'teacher' }} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Watch introduction' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Video unavailable');
  expect(screen.queryByTitle('Video preview')).toBeNull();
});
