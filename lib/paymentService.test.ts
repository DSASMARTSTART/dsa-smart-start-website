import { describe, it, expect } from 'vitest';
import {
  EUR_TO_RSD_RATE,
  eurToRsd,
  formatRsdAmount,
  generateOrderId,
  formatPrice,
} from './paymentService';

describe('eurToRsd', () => {
  it('converts using the fixed rate and rounds to 2 decimals', () => {
    expect(eurToRsd(1)).toBe(Math.round(EUR_TO_RSD_RATE * 100) / 100);
    expect(eurToRsd(10)).toBe(Math.round(10 * EUR_TO_RSD_RATE * 100) / 100);
  });

  it('returns 0 for a 0 EUR amount', () => {
    expect(eurToRsd(0)).toBe(0);
  });

  it('never produces more than 2 decimal places', () => {
    const rsd = eurToRsd(29.99);
    expect(Number.isInteger(rsd * 100)).toBe(true);
  });
});

describe('formatRsdAmount', () => {
  it('includes the RSD suffix and 2 decimals', () => {
    const out = formatRsdAmount(1);
    expect(out).toMatch(/RSD$/);
    expect(out).toMatch(/\d,\d{2} RSD$|\.\d{2} RSD$/);
  });
});

describe('generateOrderId', () => {
  it('is prefixed, uppercase, and <= 20 chars (RaiAccept OrderID limit)', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateOrderId();
      expect(id.startsWith('DSA-')).toBe(true);
      expect(id).toBe(id.toUpperCase());
      // Installment session rejects orderId longer than 20 chars.
      expect(id.length).toBeLessThanOrEqual(20);
    }
  });

  it('is unique across rapid calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateOrderId()));
    expect(ids.size).toBe(200);
  });
});

describe('formatPrice', () => {
  it('formats EUR with the currency symbol', () => {
    const out = formatPrice(29, 'EUR');
    expect(out).toMatch(/29/);
    expect(out).toMatch(/€|EUR/);
  });
});
