import type { Course, CourseFilters } from '../types';
import { createReadFetch } from '../lib/readFetch';
import { courseDetails, courseLists, courseListKey } from './courseCache';
import { mapPublishedCourse } from './courseMapping';

type PublishedFilters = Omit<CourseFilters, 'published' | 'isPublished'> & {
  published?: true;
  isPublished?: true;
};
const publishedListKey = (filters?: PublishedFilters) =>
  courseListKey({ ...filters, published: true, isPublished: true });

/** Public RLS reads need the project key, not session restoration or the auth SDK. */
async function readPublishedCourses(params: Record<string, string>): Promise<Course[]> {
  const origin = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!origin || !key) throw new Error('The course catalogue is not configured.');
  const url = new URL(`${origin.replace(/\/$/, '')}/rest/v1/courses`);
  url.search = new URLSearchParams({ ...params, select: '*', is_published: 'eq.true' }).toString();
  const response = await createReadFetch()(url.href, {
    headers: {
      apikey: key,
      // New publishable keys belong only in apikey; legacy anon JWTs can also
      // serve as the anonymous bearer token. Never read a user's session here.
      ...(!key.startsWith('sb_publishable_') ? { Authorization: `Bearer ${key}` } : {}),
      Accept: 'application/json',
    },
    credentials: 'omit',
  });
  if (!response.ok)
    throw new Error(`Unable to load courses (${response.status}). Please try again.`);
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error('The course catalogue returned an invalid response.');
  return rows.map(mapPublishedCourse);
}

export const publicCoursesApi = {
  peek: (filters?: PublishedFilters) => courseLists.peek(publishedListKey(filters)),
  peekById: (id: string) =>
    courseLists.peek(courseListKey())?.find((course) => course.id === id) ?? courseDetails.peek(id),
  list: (filters?: PublishedFilters): Promise<Course[]> =>
    courseLists.get(publishedListKey(filters), () => {
      const params: Record<string, string> = { order: 'created_at.desc' };
      for (const [field, column] of [
        ['level', 'level'],
        ['productType', 'product_type'],
        ['targetAudience', 'target_audience'],
        ['contentFormat', 'content_format'],
      ] as const) {
        const value = filters?.[field];
        if (value && value !== 'all') params[column] = `eq.${value}`;
      }
      return readPublishedCourses(params);
    }),
  getById: (id: string): Promise<Course | null> => {
    const listed = courseLists.peek(courseListKey())?.find((course) => course.id === id);
    if (listed) return Promise.resolve(listed);
    return courseDetails.get(
      id,
      async () => (await readPublishedCourses({ id: `eq.${id}`, limit: '1' }))[0] ?? null
    );
  },
};
