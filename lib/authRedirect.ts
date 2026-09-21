// Invitations and admin-issued password links use an implicit grant; normal sign-in uses PKCE.
export function isTeacherInviteRedirect(search: string, hash: string) {
  return (
    new URLSearchParams(search).get('auth') === 'teacher-invite' ||
    new URLSearchParams(hash.replace(/^#/, '')).get('type') === 'invite'
  );
}
