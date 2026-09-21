import { describe, expect, it } from 'vitest';
import { isTeacherInviteRedirect } from './authRedirect';
describe('teacher invitation callback', () => {
  it('accepts an admin invitation callback even when the redirect query is not preserved', () =>
    expect(isTeacherInviteRedirect('', '#access_token=signed-token&type=invite')).toBe(true));
  it('recognizes an existing teacher password setup link', () =>
    expect(isTeacherInviteRedirect('?auth=teacher-invite', '#type=recovery')).toBe(true));
  it('keeps normal login, checkout and PKCE recovery on the existing flow', () => {
    for (const pair of [
      ['', '#dashboard'],
      ['?code=authorization-code', '#reset-password'],
      ['', '#live-learning?course=123'],
    ])
      expect(isTeacherInviteRedirect(pair[0], pair[1])).toBe(false);
  });
});
