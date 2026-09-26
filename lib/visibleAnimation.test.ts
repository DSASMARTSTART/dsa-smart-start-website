import { afterEach, expect, it, vi } from 'vitest';
import { startVisibleAnimation } from './visibleAnimation';
afterEach(() => vi.unstubAllGlobals());
function setup(mobile: boolean, reduced = false) {
  const queries = new Map<string, { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> }>();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const value = { matches: query.includes('reduced-motion') ? reduced : mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    queries.set(query, value);
    return value;
  }));
  const frame = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', frame);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('IntersectionObserver', undefined);
  return { frame, queries };
}
it('draws a static decoration without scheduling continuous mobile frames', () => {
  const { frame } = setup(true);
  const draw = vi.fn();
  const stop = startVisibleAnimation(document.createElement('canvas'), draw);
  expect(draw).toHaveBeenCalledTimes(1);
  expect(frame).not.toHaveBeenCalled();
  stop();
});
it('keeps desktop animation and responds to switching to mobile', () => {
  const { frame, queries } = setup(false);
  const stop = startVisibleAnimation(document.createElement('canvas'), vi.fn());
  expect(frame).toHaveBeenCalledTimes(1);
  const mobile = [...queries.entries()].find(([q]) => q.includes('coarse'))![1];
  mobile.matches = true;
  frame.mockClear();
  mobile.addEventListener.mock.calls[0][1]();
  expect(frame).not.toHaveBeenCalled();
  stop();
  expect(mobile.removeEventListener).toHaveBeenCalledWith('change', mobile.addEventListener.mock.calls[0][1]);
});
it('does not animate when reduced motion is requested on desktop', () => {
  const { frame } = setup(false, true);
  const stop = startVisibleAnimation(document.createElement('canvas'), vi.fn());
  expect(frame).not.toHaveBeenCalled();
  stop();
});
