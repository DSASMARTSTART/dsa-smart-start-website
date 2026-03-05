import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── English bundles (bundled with main chunk) ──────────────────────
import commonEn from '../locales/en/common.json';
import homeEn from '../locales/en/home.json';
import coursesEn from '../locales/en/courses.json';
import faqEn from '../locales/en/faq.json';
import policiesEn from '../locales/en/policies.json';
import authEn from '../locales/en/auth.json';
import checkoutEn from '../locales/en/checkout.json';
import dashboardEn from '../locales/en/dashboard.json';
import assessmentEn from '../locales/en/assessment.json';
import contactEn from '../locales/en/contact.json';

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

// ── Lazy loaders for non-English bundles ───────────────────────────
const lazyLoad: Record<string, () => Promise<Record<string, unknown>>> = {
  'it/common':     () => import('../locales/it/common.json').then(m => m.default),
  'it/home':       () => import('../locales/it/home.json').then(m => m.default),
  'it/courses':    () => import('../locales/it/courses.json').then(m => m.default),
  'it/faq':        () => import('../locales/it/faq.json').then(m => m.default),
  'it/policies':   () => import('../locales/it/policies.json').then(m => m.default),
  'it/auth':       () => import('../locales/it/auth.json').then(m => m.default),
  'it/checkout':   () => import('../locales/it/checkout.json').then(m => m.default),
  'it/dashboard':  () => import('../locales/it/dashboard.json').then(m => m.default),
  'it/assessment': () => import('../locales/it/assessment.json').then(m => m.default),
  'it/contact':    () => import('../locales/it/contact.json').then(m => m.default),

  'sr/common':     () => import('../locales/sr/common.json').then(m => m.default),
  'sr/home':       () => import('../locales/sr/home.json').then(m => m.default),
  'sr/courses':    () => import('../locales/sr/courses.json').then(m => m.default),
  'sr/faq':        () => import('../locales/sr/faq.json').then(m => m.default),
  'sr/policies':   () => import('../locales/sr/policies.json').then(m => m.default),
  'sr/auth':       () => import('../locales/sr/auth.json').then(m => m.default),
  'sr/checkout':   () => import('../locales/sr/checkout.json').then(m => m.default),
  'sr/dashboard':  () => import('../locales/sr/dashboard.json').then(m => m.default),
  'sr/assessment': () => import('../locales/sr/assessment.json').then(m => m.default),
  'sr/contact':    () => import('../locales/sr/contact.json').then(m => m.default),

  'es/common':     () => import('../locales/es/common.json').then(m => m.default),
  'es/home':       () => import('../locales/es/home.json').then(m => m.default),
  'es/courses':    () => import('../locales/es/courses.json').then(m => m.default),
  'es/faq':        () => import('../locales/es/faq.json').then(m => m.default),
  'es/policies':   () => import('../locales/es/policies.json').then(m => m.default),
  'es/auth':       () => import('../locales/es/auth.json').then(m => m.default),
  'es/checkout':   () => import('../locales/es/checkout.json').then(m => m.default),
  'es/dashboard':  () => import('../locales/es/dashboard.json').then(m => m.default),
  'es/assessment': () => import('../locales/es/assessment.json').then(m => m.default),
  'es/contact':    () => import('../locales/es/contact.json').then(m => m.default),
};

/**
 * Load all namespaces for a given language.
 * Called on language change so the bundles are ready before React re-renders.
 */
export async function preloadLanguage(lng: string): Promise<void> {
  if (lng === 'en') return; // English is already bundled

  const loads = NAMESPACES.map(async (ns) => {
    const key = `${lng}/${ns}`;
    const loader = lazyLoad[key];
    if (!loader) return;
    if (i18n.hasResourceBundle(lng, ns)) return; // already loaded
    const bundle = await loader();
    i18n.addResourceBundle(lng, ns, bundle, true, true);
  });

  await Promise.all(loads);
}

// ── Initialise i18next ─────────────────────────────────────────────
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        home: homeEn,
        courses: coursesEn,
        faq: faqEn,
        policies: policiesEn,
        auth: authEn,
        checkout: checkoutEn,
        dashboard: dashboardEn,
        assessment: assessmentEn,
        contact: contactEn,
      },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    },
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

/**
 * Promise that resolves once the initially-detected language bundles are loaded.
 * Await (or suspend on) this before rendering the app so the UI never flashes
 * English when the user previously chose a different language.
 */
export const i18nReady: Promise<void> = preloadLanguage(i18n.language);

export default i18n;
