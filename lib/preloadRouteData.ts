import { coursesApi } from '../data/supabaseStore';
import type { parseRoute } from './routes';

/** Public reads overlap route/locale downloads and share the existing request cache. */
export function preloadRouteData(route: ReturnType<typeof parseRoute>) {
  if (route.currentPath === 'courses') void coursesApi.list().catch(() => {});
  else if (['syllabus', 'ebook', 'live-course'].includes(route.currentPath) && route.selectedCourseId) {
    void coursesApi.getById(route.selectedCourseId).catch(() => {});
  }
}
