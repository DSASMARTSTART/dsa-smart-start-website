import type { Course, Enrollment } from '../../types';
import { programs } from './model';

export function liveProgramFor(course: Pick<Course, 'level' | 'productType' | 'contentFormat'>) {
  // Never treat a self-paced course as a live product based on its title.
  if (
    course.productType !== 'service' &&
    course.contentFormat !== 'live' &&
    course.contentFormat !== 'hybrid'
  )
    return undefined;
  return programs.find((program) => program.id === course.level);
}
export function hasLiveAccess(enrollment: Pick<Enrollment, 'status'>) {
  return enrollment.status === 'active';
}
export function liveLearningPath(courseId: string, teacherId?: string) {
  const query = new URLSearchParams({ course: courseId });
  if (teacherId) query.set('teacher', teacherId);
  return `live-learning?${query.toString()}`;
}
