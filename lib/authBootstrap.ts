// This module deliberately has no SDK import. Public pages can decide whether
// session restoration is needed without downloading the database client.
let clientReady = false;
const listeners = new Set<() => void>();

export function announceAuthClientReady() {
  clientReady = true;
  for (const listener of listeners) listener();
}

export function observeAuthClientReady(listener: () => void) {
  listeners.add(listener);
  if (clientReady) listener();
  return () => {
    listeners.delete(listener);
  };
}

const anonymousPages = new Set([
  '',
  '#home',
  '#faq',
  '#who-we-are',
  '#contact',
  '#terms',
  '#privacy-policy',
  '#cookie-policy',
  '#refund-policy',
  '#courses',
  '#courses-ebooks',
  '#courses-services',
  '#courses-live',
  '#courses-interactive',
]);

/** Presence only: the SDK still validates and restores any actual session. */
export function needsAuthClient(
  location: Pick<Location, 'search' | 'hash'>,
  storage: Pick<Storage, 'getItem'>,
  supabaseUrl: string
) {
  const query = new URLSearchParams(location.search);
  if (
    (!anonymousPages.has(location.hash) &&
      !/^#(?:ebook|syllabus|live-course)-[^?&#]+$/.test(location.hash)) ||
    [
      'code',
      'auth',
      'error',
      'error_code',
      'token_hash',
      'type',
      'access_token',
      'refresh_token',
    ].some((key) => query.has(key))
  )
    return true;
  try {
    // Matches Supabase's default project-scoped storage key. A blocked storage
    // API or unknown configuration must fall back to normal initialization.
    const project = new URL(supabaseUrl).hostname.split('.')[0];
    return storage.getItem(`sb-${project}-auth-token`) !== null;
  } catch {
    return true;
  }
}
