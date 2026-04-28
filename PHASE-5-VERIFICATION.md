# Phase 5 — Verification Results & Smoke-Test Checklist

> Generated 28 Apr 2026 as the closing phase of [payment-flow-plan.md](payment-flow-plan.md).

## 14. Automated checks — RESULTS

| # | Check | Result |
|---|-------|--------|
| 14.1 | `npm run build` (TypeScript + Vite production build) | ✅ PASS — built in ~5.7 s, 1919 modules transformed, no TS errors. Only warning is the pre-existing >600 kB main-chunk size advisory. |
| 14.2 | New migration SQL structure (`supabase/migrations/20260429000000_payment_flow_hardening.sql`) | ✅ PASS — 515 lines, 7 balanced `$$` blocks, 6 `CREATE FUNCTION`, 2 `CREATE TABLE`, 9 `CREATE POLICY`. Already executed against production DB earlier this session. |
| 14.3 | Migration registered in `supabase/apply-migrations.sql` | ✅ PASS — appended with banner comment at line 366. |
| 14.4 | `supabase/diagnostic.sql` (clean-DB smoke) | ⏳ MANUAL — run in Supabase SQL Editor. Expectation: every required policy / table / function reports ✅ and the `payment_orphans` row from Phase 0 is present. |

There is no test runner configured in `package.json` (`scripts` only contains `dev`, `build`, `preview`), so 14 is complete once 14.4 has been executed by the operator.

---

## 13. Manual end-to-end smoke tests — CHECKLIST

Run these against the **sandbox** RaiAccept and PayPal credentials before flipping production traffic. Tick each row only after observing the listed evidence.

> Pre-reqs: a fresh test user, a test course (`is_published=true`), a test ebook product, and one active 50% discount code.

### A. RaiAccept happy path (single course)
- [ ] Add 1 course to cart → checkout → fill billing → click **Pay**.
- [ ] Iframe loads, sandbox card succeeds.
- [ ] DB: `purchases.status='completed'`, `webhook_verified=true`, `webhook_verified_at` set.
- [ ] DB: `enrollments.status='active'` row exists for `(user_id, course_id)`.
- [ ] Dashboard shows the course.
- [ ] CourseViewer opens and the first lesson plays.

### B. RaiAccept multi-item (course + ebook)
- [ ] Add course + ebook to cart → pay.
- [ ] DB: TWO `purchases.status='completed'` rows, TWO `enrollments` rows.
- [ ] Dashboard shows both items.
- [ ] Ebook detail page renders the **Download PDF** link (signed URL).

### C. PayPal happy path
- [ ] Switch payment method to PayPal → approve in sandbox.
- [ ] Webhook fires; `purchases.status='completed'`, enrollment created.
- [ ] If multi-item, PayPal `reference_id`/`custom_id` resolves all items; otherwise unmatched item appears in `payment_orphans`.

### D. Discount code (count exactly once)
- [ ] Apply 50% code → pay via RaiAccept.
- [ ] DB: exactly **one** new row in `discount_code_uses` for this purchase.
- [ ] DB: `discount_codes.times_used` incremented by exactly **1**.
- [ ] Repeat with PayPal — same single-increment behavior.

### E. Orphan path (self-heal + admin recovery)
- [ ] Temporarily break webhook (e.g. set wrong secret) → submit a payment.
- [ ] DB: `purchases.status='pending'` after the iframe success.
- [ ] Open `/dashboard` — `ensure_enrollment_exists` runs but cannot heal (purchase not completed). UI shows pending state.
- [ ] Restore webhook secret; replay the provider notification.
- [ ] Confirm purchase flips to completed and enrollment is created.
- [ ] If webhook permanently fails → row appears in `payment_orphans`; admin **Confirm** action grants access.

### F. Double-click guard
- [ ] On checkout, hammer the **Pay** button 5× rapidly.
- [ ] DB: only **one** `purchases` row created for that transaction.
- [ ] Provider charges only once.
- [ ] Same `idempotency_key` observed on every retried request (Network tab).

### G. Session-timeout warning
- [ ] Open checkout, leave for 25 min.
- [ ] Modal appears with **Extend session** and **Cancel**.
- [ ] **Extend** clears the warning and keeps cart intact.
- [ ] **Cancel** returns to cart without charging.

### H. Unpublished course access for enrolled users
- [ ] Admin sets the test course `is_published=false`.
- [ ] Course disappears from public catalog.
- [ ] Enrolled student dashboard still lists it; CourseViewer still loads (uses `get_course_for_enrolled_user` RPC).

### I. Ebook gating (logged out)
- [ ] Log out and open the ebook detail page.
- [ ] View HTML source — `course.ebookPdfUrl` (or signed URL) is **not** present.
- [ ] Buy CTA is shown instead of Download.

---

## Sign-off

When all rows in section 13 are checked and `supabase/diagnostic.sql` reports clean, the payment-flow plan is complete. Mark `payment-flow-plan.md` Phase 5 done and archive this checklist.
