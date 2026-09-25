/** Parse the initial URL before rendering, using the same rules as navigation. */
export function parseRoute(hash = window.location.hash) {
  const route = {
    currentPath: 'not-found', selectedCourseId: null as string | null,
    selectedTeacherId: null as string | null, liveBookingView: false,
    adminUserId: null as string | null,
    coursesDefaultTab: undefined as 'live' | 'ebooks' | undefined,
  };
  hash ||= '#home';
  const simple = ['home', 'faq', 'who-we-are', 'contact', 'login', 'checkout',
    'teacher-calendar', 'dashboard', 'terms', 'privacy-policy', 'cookie-policy',
    'refund-policy', 'reset-password', 'admin', 'admin-teachers', 'admin-courses',
    'admin-transactions', 'admin-payment-orphans', 'admin-discounts', 'admin-audit', 'admin-settings'];
  if (simple.includes(hash.slice(1))) route.currentPath = hash.slice(1);
  else if (['#courses', '#courses-ebooks', '#courses-services', '#courses-live', '#courses-interactive'].includes(hash)) {
    route.currentPath = 'courses';
    route.coursesDefaultTab = hash === '#courses' ? undefined : hash === '#courses-ebooks' ? 'ebooks' : 'live';
  } else if (hash === '#checkout-success' || hash.startsWith('#checkout-success?')) {
    route.currentPath = 'checkout-success';
  } else if (hash === '#live-learning' || hash.startsWith('#live-learning?')) {
    const params = new URLSearchParams(hash.split('?')[1] || '');
    route.currentPath = 'live-learning';
    route.selectedCourseId = params.get('course');
    route.selectedTeacherId = params.get('teacher');
    route.liveBookingView = params.get('view') === 'book';
  } else if (hash === '#admin-users' || hash.startsWith('#admin-users?')) {
    route.currentPath = 'admin-users';
    route.adminUserId = new URLSearchParams(hash.split('?')[1] || '').get('user');
  } else {
    for (const prefix of ['admin-course-edit', 'syllabus', 'ebook', 'live-course', 'viewer']) {
      if (hash.startsWith(`#${prefix}-`)) {
        route.currentPath = prefix;
        route.selectedCourseId = hash.slice(prefix.length + 2);
        break;
      }
    }
  }
  return route;
}

export function routeNamespaces(path: string): string[] {
  if (['home', 'who-we-are'].includes(path)) return ['home'];
  if (['courses', 'syllabus', 'ebook', 'live-course', 'viewer'].includes(path)) return ['courses'];
  if (['login', 'reset-password'].includes(path)) return ['auth'];
  if (['terms', 'privacy-policy', 'cookie-policy', 'refund-policy'].includes(path)) return ['policies'];
  if (path === 'checkout-success') return ['checkout', 'dashboard'];
  if (['faq', 'contact', 'checkout', 'dashboard'].includes(path)) return [path];
  return [];
}
