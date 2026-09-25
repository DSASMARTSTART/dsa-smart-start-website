import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Keep a small, offline-safe English fallback for the landing page.
import commonEn from '../locales/en/common.json';
import homeEn from '../locales/en/home.json';
import { createTranslationBackend } from './translationBackend';

export const SUPPORTED_LANGUAGES = ['en', 'it', 'sr', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'EN' },
  it: { flag: '🇮🇹', label: 'IT' },
  sr: { flag: '🇷🇸', label: 'SR' },
  es: { flag: '🇪🇸', label: 'ES' },
};

export const NAMESPACES = [
  'common',
  'home',
  'courses',
  'faq',
  'policies',
  'auth',
  'checkout',
  'dashboard',
  'assessment',
  'contact',
] as const;

// Vite emits one chunk per namespace. Visiting the homepage must not download
// policies, checkout, dashboard or assessment translations in any language.
const loaders = import.meta.glob<Record<string, unknown>>(
  ['../locales/*/*.json', '!../locales/en/common.json', '!../locales/en/home.json'],
  {
    import: 'default',
  }
);

/** Preload only namespaces used so far before switching the visible language. */
export async function preloadLanguage(lng: string): Promise<void> {
  await i18n.loadLanguages(lng);
}

export const i18nReady = i18n
  .use(createTranslationBackend(loaders))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { common: commonEn, home: homeEn } },
    partialBundledLanguages: true,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'home'],
    interpolation: { escapeValue: false },
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    react: { useSuspense: true },
  });

// ── Keep <html lang=""> in sync ────────────────────────────────────
const updateHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
updateHtmlLang(i18n.language);
i18n.on('languageChanged', (lng) => {
  updateHtmlLang(lng);
  // Bundles are preloaded BEFORE changeLanguage is called, so no async work here.
});

export default i18n;
