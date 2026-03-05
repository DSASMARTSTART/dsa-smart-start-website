import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * Locale-aware formatting utilities.
 * Uses the current i18next language to pick the correct Intl locale.
 */
export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
      }).format(d);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (amount: number, currency = 'EUR') => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (n: number, options?: Intl.NumberFormatOptions) => {
      return new Intl.NumberFormat(locale, options).format(n);
    },
    [locale],
  );

  return { formatDate, formatCurrency, formatNumber, locale };
}
