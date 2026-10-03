import { expect, it } from 'vitest';
import { ebookVimeoMap, getVimeoPreviewUrl } from './videoConfig';

it.each([
  ['en-US', '1181773348'],
  ['en-GB', '1181773348'],
  ['it-IT', '1181773462'],
  ['es-MX', '1181773590'],
])('finds a configured preview for regional browser language %s', (language, id) => {
  expect(getVimeoPreviewUrl(ebookVimeoMap, language, 'kids-basic')).toContain(`/video/${id}?`);
});

it('keeps unavailable languages and levels without a video', () => {
  expect(getVimeoPreviewUrl(ebookVimeoMap, 'sr-Latn-RS', 'kids-basic')).toBe('');
  expect(getVimeoPreviewUrl(ebookVimeoMap, 'en-US', 'A1')).toBe('');
});
