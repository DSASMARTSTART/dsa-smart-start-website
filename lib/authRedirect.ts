// Invitations and admin-issued password links use an implicit grant; normal sign-in uses PKCE.
export function isTeacherInviteRedirect(search: string, hash: string) {
  return (
    ['teacher-invite','student-invite'].includes(new URLSearchParams(search).get('auth') || '') ||
    new URLSearchParams(hash.replace(/^#/, '')).get('type') === 'invite'
  );
}
