import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import VideoPreview from './VideoPreview';

afterEach(cleanup);

const props = {
  src: 'https://player.vimeo.com/video/123?h=private-token&badge=0',
  title: 'Kids English',
  playLabel: 'Play preview',
};

it('does not create an external player until play, then preserves embed parameters and keyboard focus', () => {
  const { container } = render(<VideoPreview {...props} />);
  expect(container.querySelector('iframe')).toBeNull();
  const play = screen.getByRole('button', { name: 'Play preview: Kids English' });
  play.focus();
  fireEvent.click(play);
  const frame = screen.getByTitle(props.title) as HTMLIFrameElement;
  const url = new URL(frame.src);
  expect(url.searchParams.get('autoplay')).toBe('1');
  expect(url.searchParams.get('h')).toBe('private-token');
  expect(url.searchParams.get('badge')).toBe('0');
  expect(document.activeElement).toBe(frame);
});

it('requires a new play action when the preview language or product changes', () => {
  const { container, rerender } = render(<VideoPreview {...props} />);
  fireEvent.click(screen.getByRole('button'));
  rerender(<VideoPreview {...props} src="https://player.vimeo.com/video/456" />);
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('button', { name: 'Play preview: Kids English' })).toBeTruthy();
});
