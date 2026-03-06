import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Course } from '../types';

/**
 * Returns the localised title for the current i18n language.
 * Falls back to the English `title` when no translation exists.
 */
export function getLocalizedTitle(course: Course, lang: string): string {
  const l = lang.substring(0, 2);
  if (l === 'it' && course.titleIt) return course.titleIt;
  if (l === 'sr' && course.titleSr) return course.titleSr;
  if (l === 'es' && course.titleEs) return course.titleEs;
  return course.title;
}

/**
 * Returns the localised description for the current i18n language.
 * Falls back to the English `description` when no translation exists.
 */
export function getLocalizedDescription(course: Course, lang: string): string {
  const l = lang.substring(0, 2);
  if (l === 'it' && course.descriptionIt) return course.descriptionIt;
  if (l === 'sr' && course.descriptionSr) return course.descriptionSr;
  if (l === 'es' && course.descriptionEs) return course.descriptionEs;
  return course.description;
}

/**
 * React hook that returns a shallow copy of the course with `title` and
 * `description` already swapped to the current UI language.
 * Accepts `null` so it can be used directly with useState<Course | null>().
 *
 * Usage:
 *   const [rawCourse, setRawCourse] = useState<Course | null>(null);
 *   const course = useLocalizedCourse(rawCourse);
 *   <h1>{course?.title}</h1>
 */
export function useLocalizedCourse<T extends Course>(course: T | null): T | null {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  return useMemo(() => {
    if (!course) return null;
    if (lang.startsWith('en')) return course;
    return {
      ...course,
      title: getLocalizedTitle(course, lang),
      description: getLocalizedDescription(course, lang),
    };
  }, [course, lang]);
}

/**
 * Hook that localises an array of courses.
 */
export function useLocalizedCourses<T extends Course>(courses: T[]): T[] {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';

  return useMemo(() => {
    if (lang.startsWith('en')) return courses; // no-op for English
    return courses.map(c => ({
      ...c,
      title: getLocalizedTitle(c, lang),
      description: getLocalizedDescription(c, lang),
    }));
  }, [courses, lang]);
}
