import { describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabaseAny: { rpc } }));
import { adminAnalyticsApi, analyticsCsv } from './adminAnalytics';
describe('admin reporting API', () => {
  it('lets the server select the actual revenue currency', async () => {
    rpc.mockResolvedValue({ data: { currency: 'RSD' }, error: null });
    expect(await adminAnalyticsApi.snapshot(30)).toEqual({ currency: 'RSD' });
    expect(rpc).toHaveBeenLastCalledWith('admin_analytics_snapshot', {
      p_days: 30,
      p_currency: null,
      p_timezone: 'Europe/Belgrade',
    });
  });
  it('propagates a reporting failure rather than returning zero metrics', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Active administrator access required.' },
    });
    await expect(adminAnalyticsApi.snapshot(7, 'EUR')).rejects.toThrow('administrator');
  });
  it('exports safe CSV with quotes, newlines and formula-like titles', () => {
    const csv = analyticsCsv([
      ['Name', 'Revenue'],
      ['=IMPORTDATA("x")', 100],
      ['Line\n"two"', null],
    ]);
    expect(csv).toContain('"\'=IMPORTDATA(""x"")"');
    expect(csv).toContain('"Line\n""two"""');
    expect(csv).toContain('"100"');
  });
});
