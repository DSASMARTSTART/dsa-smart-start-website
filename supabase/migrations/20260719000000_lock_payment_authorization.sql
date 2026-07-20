-- ============================================
-- LOCK DOWN PAYMENT AUTHORIZATION — security hardening
-- Date: 2026-07-19
--
-- Closes a critical hole: a logged-in customer could grant themselves any paid
-- course for free, with no payment, using only the public anon key.
--
-- Root cause (three facts that combined into a trivial exploit):
--   1. The `purchases` INSERT RLS policy only checked `user_id`, so a user could
--      insert their OWN pending purchase row for ANY course at ANY amount.
--   2. The confirmation RPCs (confirm_purchases_by_transaction / _webhook) are
--      SECURITY DEFINER and kept the default EXECUTE grant to PUBLIC, so any
--      authenticated user could call them directly.
--   3. confirm_purchases_by_transaction flips a purchase pending -> completed and
--      creates an ACTIVE enrollment based only on (transaction_id, user_id), with
--      NO payment verification.
--   => insert a pending purchase, then call the RPC = free course.
--
-- This migration makes the payment webhook / notify edge functions (which run as
-- service_role and independently re-verify the payment with the provider) the
-- ONLY code path that can confirm a purchase or create a purchase row.
--
-- Safe to re-run. Does NOT touch the working card / installment happy path — the
-- edge functions create pending purchases with the service_role key, which is
-- exempt from RLS and retains EXECUTE via the explicit grants below.
-- ============================================

-- ── 1. Remove the user-level INSERT policy on purchases ──────────────
-- Only create_pending_purchase (SECURITY DEFINER, invoked with service_role by
-- create-raiaccept-session / create-raiffeisen-installment-session) may create
-- purchase rows. Admins retain full access via "Admins can manage purchases".
-- NOTE: this disables the legacy client-side PayPal path (purchasesApi.create);
-- PayPal must be rebuilt server-side before it is enabled.
DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;

-- ── 2. Revoke client EXECUTE on the confirmation RPCs ────────────────
-- These must only ever be called by the webhook/notify edge functions, which run
-- as service_role and verify the payment with the provider first.
REVOKE EXECUTE ON FUNCTION confirm_purchases_by_transaction(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION confirm_purchase_webhook(TEXT, JSONB)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION fail_purchase_webhook(TEXT, JSONB)           FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION confirm_purchases_by_transaction(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION confirm_purchase_webhook(TEXT, JSONB)        TO service_role;
GRANT EXECUTE ON FUNCTION fail_purchase_webhook(TEXT, JSONB)           TO service_role;

-- ── 3. Protect financial records from cascade deletion ───────────────
-- `purchases.user_id` / `purchases.course_id` were ON DELETE CASCADE, so deleting
-- a user (e.g. a GDPR erase or a Supabase auth-user delete) or a course silently
-- destroyed the entire payment/revenue audit trail for that user/course. Payment
-- records must be retained (accounting/legal). Switch to RESTRICT so a delete that
-- would erase money records is blocked — user erasure must be done by
-- anonymisation (users.status='deleted' + clearing PII), never a hard delete.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_user_id_fkey') THEN
    ALTER TABLE purchases DROP CONSTRAINT purchases_user_id_fkey;
  END IF;
  ALTER TABLE purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id)
      REFERENCES users(id) ON DELETE RESTRICT;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_course_id_fkey') THEN
    ALTER TABLE purchases DROP CONSTRAINT purchases_course_id_fkey;
  END IF;
  ALTER TABLE purchases
    ADD CONSTRAINT purchases_course_id_fkey FOREIGN KEY (course_id)
      REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not re-point purchases FKs (check constraint names): %', SQLERRM;
END $$;

-- ── 4. Prevent privilege escalation via the users self-update policy ──
-- The self-update policy had no WITH CHECK, so a normal user could set their own
-- row's role='admin' and take over the whole database. Re-create it so a user may
-- edit their own profile but may NOT change their own role or status. Admins keep
-- full control via the separate "Admins can manage all users" policy (evaluated
-- with OR), so admin role management is unaffected.
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (
    auth.uid()::text = id::text
    AND role   = (SELECT u.role   FROM users u WHERE u.id = auth.uid())
    AND status = (SELECT u.status FROM users u WHERE u.id = auth.uid())
  );

-- ── 5. Stop the users table being world-readable (PII / admin enumeration) ──
-- "Public read access for published user info" exposed every user's email, name,
-- role and status to any anon caller (a full customer PII dump + a list of which
-- emails are admins). Restrict reads to the owner and staff. Admin screens use the
-- is_admin_or_editor() path; self-reads (login/profile) use the owner path.
DROP POLICY IF EXISTS "Public read access for published user info" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = id::text OR public.is_admin_or_editor());

-- ── 6. Remove over-permissive / broken policies on discount_code_uses ──
-- Legitimate writes happen through SECURITY DEFINER RPCs (create_pending_purchase,
-- confirm_purchase_webhook) which bypass RLS, so dropping the public INSERT policy
-- does not affect checkout. Also drop the stale policy that referenced a
-- non-existent `profiles` table.
DROP POLICY IF EXISTS "Anyone can record discount code use" ON discount_code_uses;
DROP POLICY IF EXISTS "Admins can view all discount code uses" ON discount_code_uses;
CREATE POLICY "Admins can view all discount code uses" ON discount_code_uses
  FOR SELECT USING (public.is_admin_or_editor());

DO $$
BEGIN
  RAISE NOTICE '=== Payment authorization lockdown (2026-07-19) applied ===';
  RAISE NOTICE 'AuthZ: users self-update can no longer change role/status; users SELECT restricted to owner+staff.';
  RAISE NOTICE 'discount_code_uses: dropped public INSERT and stale profiles policy.';
  RAISE NOTICE 'Dropped: "Users can create own purchases" INSERT policy on purchases.';
  RAISE NOTICE 'Revoked client EXECUTE on confirm_purchases_by_transaction / confirm_purchase_webhook / fail_purchase_webhook.';
  RAISE NOTICE 'Confirmation is now service_role (webhook/notify) only.';
END $$;
