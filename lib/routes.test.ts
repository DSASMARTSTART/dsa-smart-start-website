import { describe, expect, it } from 'vitest';
import { parseRoute, routeNamespaces } from './routes';
describe('direct links', () => {
  it('resolves a detail URL and parameters on the initial render', () => {
    expect(parseRoute('#ebook-a1-test')).toMatchObject({currentPath:'ebook',selectedCourseId:'a1-test'});
    expect(parseRoute('#admin-course-edit-a1')).toMatchObject({currentPath:'admin-course-edit',selectedCourseId:'a1'});
    expect(parseRoute('#live-learning?course=one&teacher=two&view=book')).toMatchObject({currentPath:'live-learning',selectedCourseId:'one',selectedTeacherId:'two',liveBookingView:true});
  });
  it('preserves catalog aliases, policies, payment redirects and not-found routing', () => {
    expect(parseRoute('#courses-ebooks').coursesDefaultTab).toBe('ebooks');
    expect(parseRoute('#courses-interactive').coursesDefaultTab).toBe('live');
    expect(parseRoute('#checkout-success?payment=one').currentPath).toBe('checkout-success');
    expect(routeNamespaces(parseRoute('#refund-policy').currentPath)).toEqual(['policies']);
    expect(parseRoute('').currentPath).toBe('home');
    expect(parseRoute('#unknown').currentPath).toBe('not-found');
  });
});
