# Production Checklist — What's Left To Do

> Generated: March 5, 2026  
> Status legend: ❌ Not done | ⚠️ Partial | ✅ Done

---

## 1. EMAIL SYSTEM (Resend) ❌

Currently **no transactional emails are sent**. The contact form stub logs a warning and returns success without sending.

- [ ] **1.1** Create Resend account and obtain API key
- [ ] **1.2** Install `resend` package (or use fetch in Edge Function)
- [ ] **1.3** Create Supabase Edge Function: `send-contact-email`
  - Wire `contactService.ts` → `sendViaResend()` to call this function
- [ ] **1.4** Create Supabase Edge Function: `send-purchase-confirmation`
  - Trigger after successful payment (card + PayPal)
  - Include order details, course name, amount paid
- [ ] **1.5** Create Supabase Edge Function: `send-welcome-email`
  - Trigger on new user signup
- [ ] **1.6** Configure Resend as custom SMTP in Supabase dashboard
  - This makes password-reset and confirmation emails use your branding
- [ ] **1.7** Enable email confirmations in Supabase
  - Change `enable_confirmations = true` in `supabase/config.toml` (line 205)
  - Or set it in the Supabase dashboard under Auth → Settings
- [ ] **1.8** Customize email templates (password reset, confirmation, invite)
  - Design HTML templates with your brand colors/logo
  - Update in Supabase dashboard → Auth → Email Templates
- [ ] **1.9** Set Edge Function secrets in Supabase dashboard
  - `RESEND_API_KEY`
  - `CONTACT_EMAIL_TO` (where contact form emails go)
- [ ] **1.10** Test all email flows end-to-end:
  - [ ] Contact form submission → email received
  - [ ] New signup → welcome email received
  - [ ] Email confirmation link works
  - [ ] Password reset email → link works → password changed
  - [ ] Purchase → confirmation email received with correct details

---

## 2. PAYPAL FLOW ⚠️

Code exists but has never been tested end-to-end.

- [ ] **2.1** Verify `VITE_PAYPAL_CLIENT_ID` env var is set (sandbox first)
- [ ] **2.2** Test complete sandbox flow:
  - [ ] PayPal buttons render on checkout page
  - [ ] Click PayPal → PayPal popup opens → approve payment
  - [ ] Order captured successfully → purchase recorded in DB
  - [ ] User redirected to success page
  - [ ] Course appears in user's dashboard
- [ ] **2.3** Test PayPal webhook delivery
  - [ ] Webhook fires → `payment-webhook` Edge Function processes it
  - [ ] Verify fallback matching logic works (reference_id, user+course)
- [ ] **2.4** Consider migrating to server-side order creation
  - Current code uses client-side creation (`paymentService.ts` line 307)
  - PayPal best practice is server-side for security
- [ ] **2.5** Switch from sandbox to live
  - Update PayPal client ID to live credentials
  - Update webhook URL to production endpoint
  - Re-test with a real small payment
- [ ] **2.6** Test edge cases:
  - [ ] User closes PayPal popup mid-payment
  - [ ] Payment fails / card declined in PayPal
  - [ ] Double-click prevention
  - [ ] Network timeout during capture

---

## 3. MISSING ASSETS ⚠️

These files are referenced in `index.html` but don't exist.

- [x] **3.1** Create/add `public/og-image.jpg` (1200×630px recommended for social sharing) ✅ Generated branded OG image
- [ ] **3.2** Create/add `public/logo.png` (used in structured data / JSON-LD)
- [ ] **3.3** Verify `public/apple-touch-icon.png` exists (180×180px)
- [x] **3.4** Add favicon if not already present ✅ Already in place

---

## 4. i18n — TRANSLATION REVIEW ⚠️

Infrastructure is done. All 4 languages have all 10 namespace files with matching key counts. DB course content now has IT/SR/ES translations.

- [x] **4.1** Italian — native speaker review of all 10 JSON files ✅ User confirmed OK
- [ ] **4.2** Italian — check layout/overflow on all pages (especially mobile)
- [x] **4.3** Serbian — native speaker review of all 10 JSON files ✅ User confirmed OK
- [ ] **4.4** Serbian — check layout/overflow on all pages (especially mobile)
- [x] **4.5** Spanish — native speaker review of all 10 JSON files ✅ User confirmed OK
- [ ] **4.6** Spanish — check layout/overflow on all pages (especially mobile)
- [ ] **4.7** Test browser language auto-detection (set browser to IT/SR/ES and visit site)
- [ ] **4.8** Test language switcher on every page
- [ ] **4.9** Verify `<html lang>` attribute updates correctly on language change
- [ ] **4.10** Make SEO meta tags (title, description, OG) dynamic per language
- [x] **4.11** Add multi-language columns to courses table (title_it/sr/es, description_it/sr/es) ✅ Migration applied
- [x] **4.12** Populate IT/SR/ES translations for all 11 published courses ✅ Done
- [x] **4.13** Create `useLocalizedCourse` hook and wire into all display components ✅ Done

---

## 5. CLEANUP — Debug Logging & Junk Files ⚠️

- [ ] **5.1** Remove or guard all `console.log` statements in production code:
  - `supabaseStore.ts` (lines ~225, ~430)
  - `DashboardPage.tsx` (lines ~114, ~177, ~181, ~191)
  - `CheckoutPage.tsx` (lines ~196, ~222, ~512)
  - `CoursesPage.tsx` (line ~531)
- [ ] **5.2** Delete junk files from `public/assets/images/`:
  - `import React, { useState } from 'react';.tsx`
  - `import React from 'react';.tsx`
  - `# Code Citations.md`
  - `# Code Citations.txt`
- [ ] **5.3** Remove or reduce `eslint-disable` comments where possible (~40+ across codebase)

---

## 6. PRODUCTION DEPLOYMENT CONFIG ⚠️

- [ ] **6.1** Replace Tailwind CDN (`index.html` line ~106) with build-time Tailwind CSS
  - Install `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies
  - Create `tailwind.config.js` and `postcss.config.js`
  - Import Tailwind in your CSS entry point
  - Remove the CDN `<script>` tag
- [ ] **6.2** Set all production environment variables on Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_PAYPAL_CLIENT_ID` (live)
  - Any other `VITE_*` vars
- [ ] **6.3** Set Supabase Edge Function secrets:
  - `RESEND_API_KEY`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_WEBHOOK_ID`
- [ ] **6.4** Run `npx vite build` and verify zero errors
- [ ] **6.5** Test production build locally with `npx vite preview`

---

## 7. SEO & CRAWLING ⚠️

- [ ] **7.1** Fix `robots.txt` — remove duplicate `Sitemap:` and `Crawl-delay:` lines
- [ ] **7.2** Expand `sitemap.xml` — add course pages, FAQ, contact, about (or document SPA hash-routing limitation)
- [ ] **7.3** Consider migrating from hash routing (`/#/`) to browser history routing (`/courses`, `/faq`) for proper SEO indexing
- [ ] **7.4** Add `<link rel="canonical">` tags

---

## 8. PLACEHOLDER / STUB CODE TO REPLACE ⚠️

- [ ] **8.1** `LiveCourseDetailPage.tsx` — Replace placeholder Vimeo video IDs (`76979871`–`76979874`) with real course preview videos
- [ ] **8.2** `supabaseStore.ts` — Implement real `getAvgProgress()` (currently returns hardcoded `0`)
- [ ] **8.3** `supabaseStore.ts` — Improve user progress calculation (line ~283, marked as "simplified")
- [ ] **8.4** `paymentService.ts` — Update hardcoded EUR→RSD rate (`117.15`) or add auto-update mechanism
- [ ] **8.5** `adminStore.ts` — Replace mock analytics data with real Supabase queries:
  - Mock trend data → real signups over time
  - Mock engagement → real lesson completions
  - Mock watch time → real video analytics
  - Mock revenue → real transaction sums

---

## 9. DATABASE / AUTH HARDENING

- [ ] **9.1** Enable email confirmations (see 1.7)
- [ ] **9.2** Review RLS (Row Level Security) policies are correct for all tables
- [ ] **9.3** Verify admin role checks cannot be bypassed client-side
- [ ] **9.4** Test that users can only access courses they purchased
- [ ] **9.5** Add rate limiting for auth endpoints if not already configured

---

## 10. FUTURE / LOW PRIORITY

- [x] **10.1** Add multi-language columns to DB for course titles/descriptions ✅ Done — columns + translations + frontend hook
- [ ] **10.2** Migrate hash routing to browser history routing
- [ ] **10.3** Add proper TypeScript types to replace `eslint-disable` / `any` usage
- [ ] **10.4** Add automated tests (unit + e2e)
- [ ] **10.5** Set up error monitoring (Sentry or similar)
- [ ] **10.6** Set up analytics (Google Analytics, Plausible, etc.)
- [ ] **10.7** Complete `metadata.json` if it's used anywhere

---

## Quick Reference — File Locations

| What | Where |
|---|---|
| Contact email stub | `lib/contactService.ts` lines 128–141 |
| PayPal payment class | `lib/paymentService.ts` lines 225–400 |
| PayPal webhook handler | `supabase/functions/payment-webhook/index.ts` |
| Auth config | `supabase/config.toml` line 205 |
| Auth context | `contexts/AuthContext.tsx` |
| Checkout flow | `components/CheckoutPage.tsx` |
| i18n config | `lib/i18n.ts` |
| Locale files | `locales/{en,it,sr,es}/*.json` |
| Admin mock data | `data/adminStore.ts` |
| Vimeo placeholders | `components/LiveCourseDetailPage.tsx` line 324 |
| EUR→RSD rate | `lib/paymentService.ts` line 118 |
| Tailwind CDN | `index.html` line ~106 |
| OG image ref | `index.html` lines 39, 50 |
| robots.txt | `public/robots.txt` |
| sitemap.xml | `public/sitemap.xml` |
