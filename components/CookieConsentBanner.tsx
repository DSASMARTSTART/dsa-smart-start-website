import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getConsent, setConsent } from '../lib/metaPixel';

interface CookieConsentBannerProps {
  onOpenPolicy: () => void;
}

/** GDPR banner: marketing cookies (Meta Pixel) stay off until the visitor accepts. */
const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPolicy }) => {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(() => getConsent() === null);

  if (!visible) return null;

  const choose = (value: 'granted' | 'denied') => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookieBanner.title')}
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl bg-gray-900 text-white shadow-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm leading-relaxed text-gray-200 flex-1">
          {t('cookieBanner.text')}{' '}
          <button onClick={onOpenPolicy} className="underline hover:text-white">
            {t('cookieBanner.policyLink')}
          </button>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => choose('denied')}
            className="px-5 py-2.5 rounded-full border border-gray-500 text-xs font-black uppercase tracking-widest hover:border-white"
          >
            {t('cookieBanner.reject')}
          </button>
          <button
            onClick={() => choose('granted')}
            className="px-5 py-2.5 rounded-full bg-[#AB8FFF] text-xs font-black uppercase tracking-widest hover:bg-[#9a7eef]"
          >
            {t('cookieBanner.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
