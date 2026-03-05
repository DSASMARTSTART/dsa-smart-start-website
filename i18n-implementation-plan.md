# i18n Implementation Plan — Full Pipeline

## Overview
Translate the entire public-facing platform into **Italian**, **Serbian**, and **Spanish** — one language at a time.

**Order:** Italian → Serbian → Spanish  
**Translation method:** AI-generated first, then human review  
**Legal docs:** AI-translated (with review)  
**Admin panel:** English-only (9 files excluded)  
**URL strategy:** No URL prefixes — localStorage + browser detection  
**Libraries:** `react-i18next` + `i18next` + `i18next-browser-languagedetector` (already installed)  
**Estimated strings per language:** ~1,000–1,300  
**Total across 3 languages:** ~3,000–4,000  

---

## Phase A: Infrastructure (one-time setup)

### A1. Create `lib/i18n.ts`
- Initialize `i18next` with `react-i18next` and `i18next-browser-languagedetector`
- Supported languages: `['en', 'it', 'sr', 'es']`
- Fallback: `'en'`
- Detection order: `['localStorage', 'navigator']`
- 10 namespaces, default namespace: `'common'`
- Lazy-load non-English bundles

### A2. Create locale folder structure
```
locales/
  en/
    common.json        — nav, footer, buttons, errors, shared labels
    home.json          — hero, about, mission, method, career, roots, testimonials, who-we-are
    courses.json       — course descriptions, syllabi, features, ebook content, live course content
    faq.json           — 25 FAQ items (5 categories)
    policies.json      — Privacy, Cookie, Refund, T&C legal text
    auth.json          — login, register, reset password, validation
    checkout.json      — cart, payment methods, discount codes, success
    dashboard.json     — welcome, progress, my courses/ebooks
    assessment.json    — placement test UI strings
    contact.json       — form labels, validation, messages
  it/  (mirror structure — populated in Phase C)
  sr/  (mirror structure — populated in Phase D)
  es/  (mirror structure — populated in Phase E)
```

### A3. Update `index.tsx`
- Add `import './lib/i18n'` before React import
- Wrap `<App />` in `<Suspense fallback={<LoadingSpinner />}>` for lazy-loaded translation bundles

### A4. Create `components/LanguageSwitcher.tsx`
- Dropdown showing: EN 🇬🇧 / IT 🇮🇹 / SR 🇷🇸 / ES 🇪🇸
- Calls `i18n.changeLanguage()`
- Wire into `Navbar.tsx` (desktop + mobile menu)

### A5. Create `hooks/useLocaleFormat.ts`
- Exports `formatDate(date)`, `formatCurrency(amount, currency)`, `formatNumber(n)`
- Uses `i18next.language` to pick the correct `Intl` locale

### A6. Update `index.html`
- Remove hardcoded `lang="en"` and `<meta name="language" content="English">`
- Add inline `<script>` reading `localStorage.getItem('i18nextLng')` → sets `document.documentElement.lang`
- Add `<link rel="alternate" hreflang>` tags for all 4 locales

### A7. Update `vite.config.ts`
- Add `locales/**/*.json` to manual chunk strategy for per-language code-splitting

---

## Phase B: English String Extraction (component by component)

For each component: replace every hardcoded string with `t('namespace:key')` calls using `useTranslation('namespace')` hook, and place the English values into the corresponding `locales/en/*.json` file.

### Batch 1 — Shared / common (~60 strings)
| # | File | Strings to extract |
|---|------|--------------------|
| B1 | `Navbar.tsx` | Nav link labels (L30–43), logo text (L62), dropdown items (L109–128) |
| B2 | `Footer.tsx` | Section headings, quick links, copyright (L148–248) |
| B3 | `App.tsx` | Toast messages (`'Added to cart!'`, `'You already own this product!'`, etc.) |
| B4 | `WhatsAppButton.tsx` | Tooltip text |
| B5 | `CartBubble.tsx` | Tooltip text |
| B6 | `ErrorBoundary.tsx` | Error messages |

### Batch 2 — Home page (~200 strings)
| # | File | Strings to extract |
|---|------|--------------------|
| B7 | `HeroSection.tsx` | Hero title, subtitle, CTAs (L82–122) |
| B8 | `AboutSection.tsx` | "Who are we?" content paragraphs |
| B9 | `MissionSection.tsx` | Statistics, motivational text |
| B10 | `MethodSection.tsx` | 6 metric labels, passport section |
| B11 | `CareerSection.tsx` | 3 career steps |
| B12 | `RootsSection.tsx` | Level discovery, placement test CTA |
| B13 | `TestimonialsSection.tsx` | 6 reviews (translate role + review, keep names) |
| B14 | `WhoWeAre.tsx` | Team info, mission, statistics |
| B15 | `CoursesSection.tsx` | `LEVEL_CONFIG`, `FALLBACK_*_COURSES` labels |
| B16 | `PathwaysDetail.tsx` | Benefits, exam names |

### Batch 3 — Course pages (~300 strings, heaviest)
| # | File | Strings to extract |
|---|------|--------------------|
| B17 | `CoursesPage.tsx` | `COURSE_FEATURES` object, tab labels, CTAs |
| B18 | `CourseSyllabusPage.tsx` | `COURSE_CONTENT` object (~400 lines) |
| B19 | `EbookDetailPage.tsx` | `EBOOK_CONTENT` object |
| B20 | `LiveCourseDetailPage.tsx` | `LIVE_COURSE_CONTENT` object |
| B21 | `CourseViewer.tsx` | Module/lesson labels, progress text |

### Batch 4 — Auth + Checkout + Dashboard (~200 strings)
| # | File | Strings to extract |
|---|------|--------------------|
| B22 | `AuthModal.tsx` | Login/register forms, password strength, validation |
| B23 | `LoginRegisterPage.tsx` | Form labels, messages |
| B24 | `ResetPasswordPage.tsx` | Password reset flow text |
| B25 | `CheckoutPage.tsx` | Cart, payment methods, discount codes, errors, terms (1,669 lines) |
| B26 | `CheckoutSuccessPage.tsx` | Confirmation text |
| B27 | `DashboardPage.tsx` | Welcome, progress, my courses/ebooks |

### Batch 5 — Standalone pages (~250 strings)
| # | File | Strings to extract |
|---|------|--------------------|
| B28 | `FaqPage.tsx` | Move 25 `{q,a}` pairs → `locales/en/faq.json`, reference by key |
| B29 | `PolicyPage.tsx` | Move 4 legal docs → `locales/en/policies.json`, reference by key |
| B30 | `ContactPage.tsx` | Form labels, validation messages, success/error |
| B31 | `AssessmentPopup.tsx` | Test UI strings only (grammar questions stay English) |

### Batch 6 — Date/currency formatting
| # | File | Change |
|---|------|--------|
| B32 | `DashboardPage.tsx` | Replace `toLocaleDateString()` with `useLocaleFormat()` |
| B33 | `CheckoutPage.tsx` | Replace `Intl.NumberFormat` calls with `useLocaleFormat()` |

---

## Phase C: Italian Translation (Milestone 1)

- [ ] C1. Copy all 10 `locales/en/*.json` → `locales/it/*.json`
- [ ] C2. AI-translate all ~1,000–1,300 string values to Italian
- [ ] C3. Human review pass — verify translations, especially legal documents and course terminology
- [ ] C4. Layout check — Italian text is ~15–20% longer; verify no overflow in Navbar, hero CTAs, buttons, FAQ accordion
- [ ] C5. Test full Italian flow end-to-end (browser language detection, switcher, persistence)

---

## Phase D: Serbian Translation (Milestone 2)

- [ ] D1. Copy `locales/en/*.json` → `locales/sr/*.json`
- [ ] D2. AI-translate all strings to Serbian (Latin script — Latinica, confirmed)
- [ ] D3. Human review + layout check
- [ ] D4. Test full Serbian flow end-to-end

---

## Phase E: Spanish Translation (Milestone 3)

- [x] E1. Copy `locales/en/*.json` → `locales/es/*.json`
- [x] E2. AI-translate all strings to Spanish
- [ ] E3. Human review + layout check
- [ ] E4. Test full Spanish flow end-to-end

---

## Files NOT Translated (Admin — English only)

- `components/admin/AdminLayout.tsx`
- `components/admin/AdminHome.tsx`
- `components/admin/AdminUsers.tsx`
- `components/admin/AdminCourses.tsx`
- `components/admin/AdminTransactions.tsx`
- `components/admin/AdminDiscountCodes.tsx`
- `components/admin/AdminAudit.tsx`
- `components/admin/CourseEditor.tsx`
- `components/admin/AdminUIComponents.tsx`

---

## Verification Checklist (run after each language milestone)

- [ ] Browser language auto-detection works (set browser to target language)
- [ ] Language switcher toggles between all available languages on every page
- [ ] `localStorage` persists language choice across refresh
- [ ] `<html lang="">` attribute matches selected language
- [ ] Every public route renders fully translated
- [ ] Assessment: UI in target language, grammar questions in English
- [ ] Admin panel stays English regardless of language choice
- [ ] Date/currency formatting adapts to locale
- [ ] No broken layout from longer translated strings (especially mobile)
- [ ] `npm run build` passes with no TypeScript errors
- [ ] Responsive check: Navbar, hero CTAs, buttons, FAQ accordion, checkout form

---

## Estimated String Counts

| Category | ~Strings |
|----------|----------|
| UI labels (buttons, headings, nav) | 300–400 |
| Long-form content (FAQ, policies, course descriptions) | 150–200 blocks |
| Form validation / error messages | 60–80 |
| Course content data objects | 200–300 |
| Assessment UI text | 50–60 |
| SEO / metadata | 15–20 |
| **Total per language** | **~1,000–1,300** |
| **× 3 languages** | **~3,000–4,000** |

---

## Decisions Finalized

- **Serbian script:** **Latin script (Latinica)** — confirmed.
