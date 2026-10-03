import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { publicCoursesApi } from './publicCourses';
import { clearCoursesCache, courseLists, courseListKey } from './courseCache';

const row = {
  id: 'one',
  title: 'Published course',
  is_published: true,
  product_type: 'ebook',
  level: 'A1',
  pricing: { price: 35 },
  title_it: 'Corso',
  show_in_footer: true,
  allowed_payment_methods: ['card'],
};
const fetcher = vi.fn();
beforeEach(() => {
  clearCoursesCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset().mockImplementation(async () => new Response(JSON.stringify([row])));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('deduplicates public reads and supplies cached details without another request', async () => {
  const [catalogue, footer] = await Promise.all([
    publicCoursesApi.list(),
    publicCoursesApi.list({ isPublished: true }),
  ]);
  expect(catalogue).toBe(footer);
  expect(await publicCoursesApi.getById('one')).toBe(catalogue[0]);
  expect(publicCoursesApi.peekById('one')).toBe(catalogue[0]);
  expect(catalogue[0]).toMatchObject({
    titleIt: 'Corso',
    productType: 'ebook',
    showInFooter: true,
    allowedPaymentMethods: ['card'],
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('uses only anonymous credentials and always filters published products', async () => {
  await publicCoursesApi.list({
    level: 'A1',
    productType: 'ebook',
    targetAudience: 'kids',
    contentFormat: 'pdf',
  });
  const [url, options] = fetcher.mock.calls[0];
  expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
    select: '*',
    is_published: 'eq.true',
    order: 'created_at.desc',
    level: 'eq.A1',
    product_type: 'eq.ebook',
    target_audience: 'eq.kids',
    content_format: 'eq.pdf',
  });
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBe('Bearer public-anon-key');
  expect(options.headers.apikey).toBe('public-anon-key');
});

it('does not let a runtime unpublished flag populate the admin cache', async () => {
  await publicCoursesApi.list({ published: false } as never);
  expect(new URL(fetcher.mock.calls[0][0]).searchParams.get('is_published')).toBe('eq.true');
  expect(courseLists.peek(courseListKey({ published: false }))).toBeUndefined();
  expect(publicCoursesApi.peek()).toHaveLength(1);
});

it('keeps publishable keys out of the bearer header', async () => {
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_example');
  await publicCoursesApi.getById('one');
  expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});

it('encodes product IDs as filter values rather than additional URL parameters', async () => {
  await publicCoursesApi.getById('one&is_published=eq.false');
  const params = new URL(fetcher.mock.calls[0][0]).searchParams;
  expect(params.get('id')).toBe('eq.one&is_published=eq.false');
  expect(params.getAll('is_published')).toEqual(['eq.true']);
});

it('does not cache failed reads or missing products and supports retry', async () => {
  fetcher.mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
  await expect(publicCoursesApi.getById('one')).rejects.toThrow('503');
  fetcher.mockResolvedValueOnce(new Response('[]'));
  expect(await publicCoursesApi.getById('one')).toBeNull();
  expect(publicCoursesApi.peekById('one')).toBeUndefined();
  expect((await publicCoursesApi.getById('one'))?.title).toBe(row.title);
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('invalidates public data with the existing account-change cache reset', async () => {
  await publicCoursesApi.getById('one');
  clearCoursesCache();
  expect(publicCoursesApi.peekById('one')).toBeUndefined();
  await publicCoursesApi.getById('one');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
