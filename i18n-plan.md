# Platform Internationalization Plan

## Overview
Translate the entire public-facing platform into **Italian**, **Serbian**, and **Spanish** — one language at a time, starting with **Italian**.

## Decisions
- **Library:** `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- **Admin panel:** English-only (reduces scope by ~200 strings / 9 files)
- **URL strategy:** No URL change — language stored in localStorage, detected from browser
- **Default language:** Auto-detect from `navigator.language`, fallback English
- **First language:** Italian (primary market: Italian families with DSA children)
- **Namespace split:** 10 namespaces by domain area
- **Assessment questions:** English grammar test stays untranslated; only UI chrome translates
- **Database content:** Deferred — front-end hardcoded objects handle the immediate need

---

## Phase 1: i18n Infrastructure

1. Install deps: `react-i18next`, `i18next`, `i18next-browser-languagedetector`
2. Create `lib/i18n.ts` — i18next init with browser detection, localStorage persistence, fallback `en`, supported `['en','it','sr','es']`
3. Import `./lib/i18n` in `index.tsx` before React render
4. Create translation file structure:
   ```
   locales/
     en/
       common.json      — nav, footer, buttons, errors, shared labels
       home.json         — hero, about, mission, method, career, roots, testimonials, who-we-are
       courses.json      — course descriptions, syllabi, features, ebook content, live course content
       faq.json          — 25 FAQ items (5 categories)
       policies.json     — Privacy, Cookie, Refund, T&C legal text
       auth.json         — login, register, reset password, validation
       checkout.json     — cart, payment methods, discount codes, success
       dashboard.json    — welcome, progress, my courses/ebooks
       assessment.json   — placement test UI strings
       contact.json      — form labels, validation, messages
     it/  (mirror structure)
     sr/  (mirror structure)
     es/  (mirror structure)
   ```
5. Create `hooks/useLocaleFormat.ts` — centralized `formatDate()`, `formatCurrency()`, `formatNumber()` using current locale
6. Create `components/LanguageSwitcher.tsx` — dropdown with EN / IT / SR / ES, wire into Navbar
7. Update `index.html` — dynamic `<html lang="">` via inline script reading localStorage

---

## Phase 2: String Extraction (file by file)

### common namespace
- `Navbar.tsx` — nav labels
- `Footer.tsx` — section headings, links, legal info, copyright
- `WhatsAppButton.tsx` — tooltip
- `CartBubble.tsx` — tooltip
- `ErrorBoundary.tsx` — error messages
- `App.tsx` — toast messages

### home namespace
- `HeroSection.tsx` — hero text, CTAs
- `AboutSection.tsx` — "Who are we?" content
- `MissionSection.tsx` — statistics, motivational text
- `MethodSection.tsx` — 6 metric labels, passport section
- `CareerSection.tsx` — 3 career steps
- `RootsSection.tsx` — level discovery, placement test CTA
- `TestimonialsSection.tsx` — 6 testimonials (names stay, role + review translate)
- `WhoWeAre.tsx` — team info, mission, statistics
- `CoursesSection.tsx` — fallback descriptions, headings
- `PathwaysDetail.tsx` — benefits, exam names

### courses namespace (heaviest — large nested data objects)
- `CoursesPage.tsx` — COURSE_FEATURES object, tab labels, CTAs
- `CourseSyllabusPage.tsx` — COURSE_CONTENT object (~400 lines)
- `EbookDetailPage.tsx` — EBOOK_CONTENT object
- `LiveCourseDetailPage.tsx` — LIVE_COURSE_CONTENT object
- `CourseViewer.tsx` — module/lesson labels, progress

### auth namespace
- `AuthModal.tsx` — login/register, password strength, validation
- `LoginRegisterPage.tsx` — form labels, messages
- `ResetPasswordPage.tsx` — password reset flow

### checkout namespace
- `CheckoutPage.tsx` — cart, payment, forms, terms, discount codes, errors (~1669 lines)
- `CheckoutSuccessPage.tsx` — confirmation text

### dashboard namespace
- `DashboardPage.tsx` — welcome, progress, my courses/ebooks

### Other namespaces
- `FaqPage.tsx` → `faq.json` — 25 FAQ items across 5 categories
- `PolicyPage.tsx` → `policies.json` — 4 full legal documents
- `ContactPage.tsx` → `contact.json` — form labels, validation, success/error
- `AssessmentPopup.tsx` → `assessment.json` — test UI text (not grammar questions)

---

## Phase 3: Italian Translation

- Copy all `locales/en/*.json` → `locales/it/*.json`
- Translate all ~1,000–1,300 string values to Italian
- Update `index.html` SEO: add `<link rel="alternate" hreflang>` tags
- Update JSON-LD structured data: `"availableLanguage"` array

---

## Phase 4: Polish & Edge Cases

- Replace 18 scattered `toLocaleDateString()` / `Intl.NumberFormat` calls with `useLocaleFormat()` hook
- Reactive `<html lang="">` attribute on language change
- `<Suspense>` fallback for lazy-loaded translation bundles
- TODO comment in `data/supabaseStore.ts` for future DB multi-language columns
- Layout check: Italian text is ~15-20% longer than English

---

## Verification Checklist

- [ ] Browser language auto-detection works (set browser to `it`)
- [ ] Language switcher toggles EN ↔ IT on all pages
- [ ] localStorage persists language choice across refresh
- [ ] `<html lang="">` attribute matches selected language
- [ ] Every public route renders fully translated
- [ ] Assessment: UI in Italian, grammar questions in English
- [ ] Admin panel stays English
- [ ] Date/currency formatting adapts to locale
- [ ] No broken layout from longer Italian strings
- [ ] `npm run build` passes with no TypeScript errors

---

## Estimated String Counts

| Category | ~Strings |
|----------|----------|
| UI labels (buttons, headings, nav) | 300–400 |
| Long-form content (FAQ, policies, course descriptions) | 150–200 blocks |
| Form validation/error messages | 60–80 |
| Course content data objects | 200–300 |
| Assessment UI text | 50–60 |
| SEO/metadata | 15–20 |
| **Total per language** | **~1,000–1,300** |
| **× 3 languages** | **~3,000–4,000** |

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
