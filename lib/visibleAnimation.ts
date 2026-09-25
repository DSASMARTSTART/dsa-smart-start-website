/** Run decorative canvas work only while visible, capped at 30 frames/second. */
export function startVisibleAnimation(element: HTMLElement, draw: () => void) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let frame = 0;
  let last = 0;
  let stopped = false;
  const tick = (time: number) => {
    if (stopped) return;
    if (time - last >= 1000 / 30) {
      draw();
      last = time;
    }
    frame = requestAnimationFrame(tick);
  };
  const update = () => {
    cancelAnimationFrame(frame);
    if (!stopped && visible && !document.hidden && !motion.matches) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          update();
        });
  observer?.observe(element);
  document.addEventListener('visibilitychange', update);
  motion.addEventListener('change', update);
  draw();
  update();
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', update);
    motion.removeEventListener('change', update);
  };
}
