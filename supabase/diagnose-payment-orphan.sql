-- ============================================
-- DIAGNOSE: RaiAccept payment took money but no access granted
-- Run each block separately in Supabase SQL Editor and inspect the output.
-- ============================================

-- ──────────────────────────────────────────────
-- 1. Has the invoicing migration been applied?
-- ──────────────────────────────────────────────
-- Expect: a row for app_settings, invoices, and 8 billing_* columns on purchases.
SELECT to_regclass('public.app_settings')   AS app_settings_exists,
       to_regclass('public.invoices')        AS invoices_exists,
       to_regclass('public.payment_orphans') AS payment_orphans_exists;

SELECT column_name
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'purchases'
   AND column_name LIKE 'billing_%'
 ORDER BY column_name;
-- Expect 8 rows: billing_address, billing_city, billing_company_name,
-- billing_country, billing_name, billing_pib, billing_postal_code, billing_vat_id


-- ──────────────────────────────────────────────
-- 2. How many overloads of create_pending_purchase exist?
-- ──────────────────────────────────────────────
-- Expect ONE overload with 19 args. If you see only an 11-arg version,
-- the invoicing migration is NOT applied → that is the root cause.
SELECT proname,
       pronargs,
       pg_get_function_identity_arguments(oid) AS args
  FROM pg_proc
 WHERE proname = 'create_pending_purchase';


-- ──────────────────────────────────────────────
-- 3. Find the affected purchase attempt(s) for the user
-- ──────────────────────────────────────────────
-- Replace the email below with your account email.
WITH me AS (
  SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE@example.com'
)
SELECT p.*
  FROM purchases p
  JOIN me ON p.user_id = me.id
 ORDER BY p.purchased_at DESC NULLS LAST, p.id DESC
 LIMIT 10;
-- If this returns ZERO rows for the time of payment → the pending row
-- was never created (edge function silently failed).


-- ──────────────────────────────────────────────
-- 4. Did a webhook arrive but find no row to confirm?
-- ──────────────────────────────────────────────
-- (Check the Supabase Dashboard → Edge Functions → payment-webhook → Logs
--  for entries matching "Purchase not found for transactionId=".)


-- ──────────────────────────────────────────────
-- 5. Does an enrollment exist for the affected user/course?
-- ──────────────────────────────────────────────
-- Replace the email and course slug/title.
WITH me AS (
  SELECT id FROM users WHERE email = 'YOUR_EMAIL_HERE@example.com'
), the_course AS (
  SELECT id, title FROM courses WHERE title ILIKE '%PUT_PART_OF_COURSE_TITLE%'
)
SELECT e.*
  FROM enrollments e
  JOIN me        ON e.user_id   = me.id
  JOIN the_course ON e.course_id = the_course.id;
