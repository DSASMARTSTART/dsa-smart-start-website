import { createRequestCache } from '../lib/requestCache';
import type { Course, CourseFilters } from '../types';

export const courseLists = createRequestCache<Course[]>(60_000);
export const courseDetails = createRequestCache<Course | null>(60_000);
export const courseListKey = (filters?: CourseFilters) =>
  JSON.stringify({
    level: filters?.level || 'all',
    productType: filters?.productType || 'all',
    targetAudience: filters?.targetAudience || 'all',
    contentFormat: filters?.contentFormat || 'all',
    published: (filters?.published ?? filters?.isPublished) !== false,
    search: filters?.search || '',
  });

export const clearCoursesCache = () => {
  courseLists.clear();
  courseDetails.clear();
};
