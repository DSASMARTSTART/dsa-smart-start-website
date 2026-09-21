import { describe, expect, it } from 'vitest';
import { hasLiveAccess, liveLearningPath, liveProgramFor } from './catalog';

describe('live learning product routing', () => {
  it('routes each supported live program by product metadata', () => {
    for (const level of ['language-lab', 'language-lab-pro', 'starter-path', 'hybrid-pack']) {
      expect(liveProgramFor({ level, productType: 'service', contentFormat: 'live' })?.id).toBe(
        level
      );
    }
  });
  it('does not route self-paced or PDF products to a teacher even if their level matches', () => {
    expect(
      liveProgramFor({
        level: 'language-lab',
        productType: 'learndash',
        contentFormat: 'interactive',
      })
    ).toBeUndefined();
    expect(
      liveProgramFor({ level: 'starter-path', productType: 'ebook', contentFormat: 'pdf' })
    ).toBeUndefined();
    expect(
      liveProgramFor({ level: 'unknown', productType: 'service', contentFormat: 'live' })
    ).toBeUndefined();
  });
  it('only enables current active entitlements, not completed or revoked ones', () => {
    expect(hasLiveAccess({ status: 'active' })).toBe(true);
    expect(hasLiveAccess({ status: 'completed' })).toBe(false);
    expect(hasLiveAccess({ status: 'revoked' })).toBe(false);
  });
  it('preserves course and teacher identifiers in the platform route', () => {
    const path = liveLearningPath('course/a?b', 'teacher & 1');
    const params = new URLSearchParams(path.split('?')[1]);
    expect(path.startsWith('live-learning?')).toBe(true);
    expect(params.get('course')).toBe('course/a?b');
    expect(params.get('teacher')).toBe('teacher & 1');
    expect(new URLSearchParams(liveLearningPath('course-1').split('?')[1]).has('teacher')).toBe(
      false
    );
  });
});
