# Plan: Harden full payment flow (cart → checkout → webhook → access)

> **Diagnostic (28 Apr 2026) confirmed three RLS gaps that alone caused the "I bought it but can't see it" symptom:**
> - `courses` had no public `SELECT` policy → catalog & purchased courses invisible.
> - `enrollments` had no policies at all → users couldn't read their own enrollments → DashboardPage stayed empty.
> - `purchases` had no `Users can view own purchases` SELECT → pending-state polling and self-heal couldn't see the row.
>
> Phase 0 fixes these three with scripts that already exist in the repo. Run it **before** any code change. Phase 0 is now complete on production DB as of 28 Apr 2026.

Full overhaul of the purchase pipeline so customers reliably:
1. Complete payment via both **RaiAccept (card)** and **PayPal**.
2. Immediately get access to the purchased course/ebook.

Adds orphan reconciliation, transactional webhook confirmation, accurate discount tracking, and tightened access gating. New SQL goes into `supabase/migrations/` and is mirrored into `supabase/schema.sql` for fresh installs.

---

## Phase 0 — IMMEDIATE SQL TRIAGE (run NOW in Supabase SQL Editor, in this order)

These are existing repo scripts — safe to re-run, no code change needed. Unblocks current customers immediately.

| # | File | Status | Why |
|---|------|--------|-----|
| 0.1 | `supabase/add-missing-policies.sql` | ✅ done | Adds `Anyone can view published courses`, plus missing policies on `audit_logs`, `activities`, `contact_messages`, `discount_codes`. |
| 0.2 | `supabase/apply-purchase-fix.sql` | ✅ done | Adds `Users can view own purchases` SELECT + `fail_purchase_webhook` + PayPal fallback `confirm_purchase_by_user_course`. |
| 0.3 | `supabase/fix-student-courses-access.sql` | ⚠ partial — failed on duplicate `Admins can view all courses`. Use the inline cleanup block below instead. | Adds `Users can view own enrollments` and admin-manage policies. |
| 0.4 | `supabase/fix-courses-visibility.sql` | ✅ done | Backfills any wrongly unpublished products. |
| 0.5 | `supabase/migrations/20260428000000_payment_orphans.sql` | ✅ done | Creates `payment_orphans` table. |
| 0.6 | `supabase/diagnostic.sql` | re-run | Confirm every required policy/table/function shows ✅. |

### Cleanup block for 0.3 (idempotent — replaces the failing script)

```sql
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Public can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Students can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON courses;
DROP POLICY IF EXISTS "Admins can update courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON courses;

CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can view all courses" ON courses
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')));
CREATE POLICY "Admins can insert courses" ON courses
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')));
CREATE POLICY "Admins can update courses" ON courses
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')));
CREATE POLICY "Admins can delete courses" ON courses
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')));
```

### Stuck pending-purchase cleanup (one-off, also done 28 Apr 2026)

Three `pending` rows for `elevirga17@gmail.com` / *DSA Smart Start Basic – Starters Ebook* (txns `DSA-MNCYFM8E-2A96JR`, `DSA-MNGDI2BU-1BJPC1`, `DSA-MNIZP9GL-4JVF5X`) were marked `failed` (Path 1 — no charge in RaiAccept portal). Recovery template for the "real money received" case lives in `supabase/recover-payment-orphan.sql`.

After Phase 0 the diagnostic should show **only** the new items added in Phase 1 below as missing.

---

## Phase 1 — Database & RPC hardening (foundation, blocks Phase 2)

1. **New migration `supabase/migrations/20260429000000_payment_flow_hardening.sql`** containing:
   - Backfill missing columns into `purchases` if absent (`status`, `webhook_verified`, `webhook_verified_at`, `payment_provider_response`, `billing_*`) — guarded `ADD COLUMN IF NOT EXISTS`.
   - Create `discount_code_uses` audit table (id, discount_code_id, user_id, purchase_id, used_at) + RLS (owner read, service_role write).
   - Create `payment_orphans` table if missing (idempotent, mirrors existing migration).
   - Add unique partial index on `purchases (transaction_id, course_id) WHERE transaction_id IS NOT NULL` to harden duplicate guard.
   - Recreate `confirm_purchase_webhook(p_transaction_id, p_provider_response)` — **fully transactional**: update purchases → upsert enrollments → insert into `discount_code_uses` (only when webhook flips `webhook_verified` false→true). Returns `{purchases_confirmed, enrollments_created, errors[]}`. Aborts on partial failure.
   - Recreate `confirm_purchases_by_transaction` (client fallback) so it **does NOT** increment discount usage — webhook-only to prevent double-count.
   - Recreate `ensure_enrollment_exists(p_user_id)` to also normalize `revoked` rows back to `active` when a completed purchase exists.
   - Add `get_payment_orphans()` and `resolve_payment_orphan(p_id, p_action, p_notes)` RPCs (admin-only via `SECURITY DEFINER` + role check).
   - Add `get_course_for_enrolled_user(course_id)` RPC for the unpublished-but-enrolled access path.
   - Add missing SELECT RLS policies for `purchases`, `enrollments` (idempotent, mirrors `apply-purchase-fix.sql`).
2. Update `supabase/schema.sql` so fresh installs include all of the above.
3. Register the new migration in `supabase/apply-migrations.sql`.

---

## Phase 2 — Edge functions (parallel after Phase 1 SQL is written)

4. **`supabase/functions/payment-webhook/index.ts`**
   - Validate `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` at boot, return 500 with explicit message if missing (logged, not exposed).
   - On webhook receipt: log raw provider + `transactionId` immediately for audit.
   - Replace ad-hoc update logic with a single call to the new transactional `confirm_purchase_webhook` RPC; treat any partial-failure response as orphan.
   - PayPal fallback chain (`reference_id` → `custom_id` → orphan) must verify **all** items in a multi-item txn confirmed; otherwise insert remainder into `payment_orphans` with reason.
   - Always return 200 to provider after recording outcome (provider retries cause duplicate noise).
   - Fire-and-forget invoice generation only after successful confirmation.

5. **`supabase/functions/create-raiaccept-session/index.ts`**
   - Fail fast with explicit error if any of `RAIACCEPT_API_USERNAME`, `RAIACCEPT_API_PASSWORD`, `SUPABASE_URL` missing.
   - Add 3-attempt exponential backoff to `authenticate()` Cognito call.
   - Sanitize 5xx response bodies returned to browser (do not leak DB error text).
   - Accept and forward `idempotency_key` header from client; pass to `create_pending_purchase` to dedupe rapid double-clicks.

---

## Phase 3 — Frontend checkout & access gating (parallel after Phase 1)

6. **`components/CheckoutPage.tsx`**
   - Move `validateBilling()` to run before BOTH RaiAccept and PayPal flows (single guard at submit).
   - Disable Pay/Continue button + show spinner while iframe/SDK is initializing or after a payment attempt has been dispatched.
   - Generate one `idempotency_key` (UUID in state) per checkout attempt and pass to edge function; reset on cart change.
   - Wire up the existing `sessionWarning` state to an actual JSX modal with **Extend session** / **Cancel** buttons.
   - On PayPal `onApprove` and on RaiAccept iframe success: clear cart, call `confirm_purchases_by_transaction` (defensive fallback), call `ensure_enrollment_exists`, then redirect.

7. **`lib/paymentService.ts`**
   - Surface PayPal SDK load failure (15 s timeout) to caller via thrown error / status callback so CheckoutPage can show a banner.
   - Centralize the EUR→RSD rate (currently hardcoded 117.15) behind a single exported constant + TODO note for live rate source.

8. **`components/CheckoutSuccessPage.tsx`**
   - On mount call `ensure_enrollment_exists` RPC before listing recent purchases.
   - Poll `purchasesApi.getByUser` until `status='completed'` OR 60 s timeout; on timeout show "Payment is processing — we will email you" message and link to dashboard.

9. **Access gating**
   - `data/supabaseStore.ts` `enrollmentsApi.getByUserWithCourses`: drop the `is_published` filter — enrolled users keep access regardless of publish state.
   - `components/CourseViewer.tsx`: load course via new `get_course_for_enrolled_user` RPC so unpublished courses still render for enrolled users; admin/editor bypass remains.
   - `components/EbookDetailPage.tsx`: gate the PDF download URL behind a runtime enrollment check via `enrollmentsApi.checkEnrollment`. Render Buy CTA otherwise. Do **not** render `course.ebookPdfUrl` in DOM unless owned.

---

## Phase 4 — Admin orphan reconciliation UI (depends on Phase 1 RPCs)

10. **New `components/admin/AdminPaymentOrphans.tsx`**
    - Table of `payment_orphans` (transaction_id, provider, amount, raw payload, created_at).
    - Per-row actions: **Match to user+course → confirm** (`resolve_payment_orphan` action='confirm'), **Mark refunded**, **Dismiss as test**.
    - Uses existing `AdminUIComponents` styling.
11. **`components/admin/AdminLayout.tsx`** — add nav entry "Payment Orphans" with badge count from `get_payment_orphans()`.
12. **`components/admin/AdminHome.tsx`** — surface unresolved-orphan banner if count > 0.

---

## Phase 5 — Verification

13. **Manual end-to-end smoke tests** (sandbox keys):
    - RaiAccept happy path (1 course → pay → webhook → purchase=completed, enrollment=active, course visible in dashboard, course viewer loads).
    - RaiAccept multi-item (course + ebook → both confirmed, both visible, ebook PDF accessible).
    - PayPal happy path.
    - Discount code: apply 50% → pay → `discount_code_uses` row inserted exactly once, `times_used` incremented exactly once.
    - Orphan path: simulate webhook 500 → `ensure_enrollment_exists` self-heals; if not, orphan row appears in admin UI; admin "confirm" grants access.
    - Double-click guard: rapidly click Pay → only one purchase row, only one charge.
    - Session timeout warning: open checkout, wait 25 min → warning modal appears, extend works.
    - Unpublished course: admin unpublishes → enrolled student still sees it in dashboard and can open it.
    - Ebook gating: log out → ebook PDF URL is not present in HTML source.

14. **Automated checks**
    - `npm run build` — TypeScript passes.
    - Existing test scripts in `package.json`.
    - SQL: run new migration on a clean DB copy and verify `supabase/diagnostic.sql` reports zero anomalies.

---

## Relevant files

- `supabase/migrations/20260429000000_payment_flow_hardening.sql` *(new)* — all DB changes above.
- `supabase/schema.sql` — sync new tables/columns/policies/RPCs for fresh installs.
- `supabase/apply-migrations.sql` — register new migration.
- `supabase/functions/payment-webhook/index.ts` — transactional confirmation, multi-item orphan detection, env validation.
- `supabase/functions/create-raiaccept-session/index.ts` — env validation, Cognito retry, idempotency key, sanitized errors.
- `lib/paymentService.ts` — surface PayPal SDK errors, centralize FX rate.
- `components/CheckoutPage.tsx` — universal billing validation, button locking, idempotency key, session warning UI, post-success self-heal.
- `components/CheckoutSuccessPage.tsx` — call `ensure_enrollment_exists`, polling with timeout.
- `components/CourseViewer.tsx` — allow enrolled users to view unpublished courses (via new RPC).
- `components/EbookDetailPage.tsx` — gate PDF URL behind enrollment check.
- `data/supabaseStore.ts` — drop `is_published` filter in `enrollmentsApi.getByUserWithCourses`; add `paymentOrphansApi`.
- `components/admin/AdminPaymentOrphans.tsx` *(new)* + `AdminLayout.tsx` + `AdminHome.tsx` — orphan reconciliation UI.

---

## Decisions

- **Discount usage counted once, by webhook only.** Client fallback RPC will not increment to avoid double-count. If the webhook never fires, admin orphan resolution will increment.
- **Enrollment is the single source of truth for access.** `is_published` only controls catalog discoverability, not access for already-enrolled users.
- **Webhook always returns 200** after recording outcome (success or orphan) to prevent provider retries from spamming the system; orphan rows are the recovery channel.
- **Idempotency key is a client-generated UUID** stored in CheckoutPage state for the lifetime of one checkout attempt; reset on cart change.
- **EUR→RSD FX rate stays hardcoded for now** (live rate source out of scope) but moved behind a single named constant with TODO.
- **Out of scope:** rewriting cart context to be cross-device persistent, replacing localStorage, building automated end-to-end tests, integrating live FX feed, refunds automation.

---

## Further considerations

1. **Cart persistence across devices?** Currently localStorage-only. Recommend keep localStorage now (Option A) → migrate to a `carts` table later (Option B). *Defer to follow-up.*
2. **Should webhook orphans auto-email admin?** Recommend yes (Option A) via `sendAdminAlertEmail`, threshold = first orphan in 1 h window vs admin-UI badge only (Option B).
3. **Live RaiAccept FX rate source?** NBS daily feed (A) / RaiAccept-supplied rate at order creation (B, recommended once exposed) / hardcoded (C, current).
