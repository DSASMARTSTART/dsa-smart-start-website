// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('metaPixel', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    delete (window as any).fbq;
    delete (window as any)._fbq;
    document.head.innerHTML = '<script></script>';
  });

  it('sends nothing before consent', async () => {
    const m = await import('./metaPixel');
    m.trackPageView();
    m.trackPurchase({ purchaseId: 'p1', courseId: 'c1', value: 35 });
    expect(window.fbq).toBeUndefined();
  });

  it('loads pixel after consent and dedupes purchases', async () => {
    const m = await import('./metaPixel');
    m.setConsent('granted');
    expect(typeof window.fbq).toBe('function');
    const calls = () => (window.fbq as any).queue.map((a: unknown[]) => a[1]);
    expect(calls()).toEqual(['1659927192416403', 'PageView']);
    m.trackPurchase({ purchaseId: 'p1', courseId: 'c1', value: 35, currency: 'eur' });
    m.trackPurchase({ purchaseId: 'p1', courseId: 'c1', value: 35 });
    expect(calls().filter((c: string) => c === 'Purchase')).toHaveLength(1);
    const purchase = (window.fbq as any).queue.find((a: unknown[]) => a[1] === 'Purchase');
    expect(purchase[2]).toMatchObject({ value: 35, currency: 'EUR', content_ids: ['c1'] });
  });

  it('respects a rejection', async () => {
    const m = await import('./metaPixel');
    m.setConsent('denied');
    m.trackViewContent({ id: 'c1', name: 'A1', value: 35 });
    expect(window.fbq).toBeUndefined();
  });
});
