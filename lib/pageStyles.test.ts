import { beforeEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ requested: [] as string[] }));
beforeEach(() => {
  vi.resetModules();
  f.requested.length = 0;
  vi.doUnmock('../route.css');
  vi.doUnmock('../workspace.css');
  vi.doMock('../route.css', () => { f.requested.push('public'); return {}; });
  vi.doMock('../workspace.css', () => { f.requested.push('workspace'); return {}; });
});

it('loads only the complete stylesheet when a workspace is visited before a public page', async () => {
  const styles = await import('./pageStyles');
  const full = styles.loadWorkspaceStyles();
  expect(styles.loadPublicStyles()).toBe(full);
  await full;
  await styles.loadPublicStyles();
  expect(f.requested).toEqual(['workspace']);
});

it('keeps the public sheet before the full sheet and never requests either twice', async () => {
  const styles = await import('./pageStyles');
  const first = styles.loadPublicStyles();
  expect(styles.loadPublicStyles()).toBe(first);
  await first;
  const full = styles.loadWorkspaceStyles();
  await full;
  expect(styles.loadWorkspaceStyles()).toBe(full);
  await styles.loadPublicStyles();
  expect(f.requested).toEqual(['public', 'workspace']);
});
