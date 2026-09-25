import { beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ from: vi.fn(), result: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: f.from } }));
import { coursesApi, clearCoursesCache } from './supabaseStore';

beforeEach(() => {
  vi.clearAllMocks();
  clearCoursesCache();
  f.from.mockImplementation(() => {
    const query = { select: vi.fn(), eq: vi.fn(), order: f.result, single: f.result };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    return query;
  });
});
const row = { id: 'one', title: 'Course', is_published: true, modules: [], pricing: { price: 20 } };

describe('course cache integration', () => {
  it('shares the footer and catalog query and reuses full details on navigation', async () => {
    f.result.mockResolvedValue({ data: [row], error: null });
    const [catalog, footer] = await Promise.all([
      coursesApi.list(),
      coursesApi.list({ isPublished: true }),
    ]);
    expect(catalog).toEqual(footer);
    expect((await coursesApi.getById('one'))?.title).toBe('Course');
    expect(f.from).toHaveBeenCalledTimes(1);
  });
  it('does not return an ebook-only result for the full catalog', async () => {
    f.result.mockResolvedValueOnce({ data: [{ ...row, product_type: 'ebook' }], error: null });
    await coursesApi.list({ productType: 'ebook' });
    f.result.mockResolvedValueOnce({ data: [row, { ...row, id: 'two' }], error: null });
    expect(await coursesApi.list()).toHaveLength(2);
    expect(f.from).toHaveBeenCalledTimes(2);
  });
  it('refetches course data after invalidation', async () => {
    f.result.mockResolvedValue({ data: row, error: null });
    await Promise.all([coursesApi.getById('one'), coursesApi.getById('one')]);
    clearCoursesCache();
    await coursesApi.getById('one');
    expect(f.from).toHaveBeenCalledTimes(2);
  });
});
