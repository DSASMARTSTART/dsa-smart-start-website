-- ============================================
-- RETIRED TEST MIGRATION — now a no-op
-- Originally: "Set all prices to €1 for live payment testing" (2026-02-18)
-- Neutralized: 2026-07-06
--
-- This migration used to overwrite every non-free course/product/service price
-- with €1 for gateway testing. It is a LAUNCH BLOCKER if it ever runs against
-- real data, and it has no revert, so a fresh `supabase db reset` would silently
-- re-zero every price (later migrations only re-priced e-books and live courses,
-- NOT interactive/learndash courses or services).
--
-- The body has been removed so migration history/order is preserved while the
-- destructive effect is gone. To restore real prices on an already-wiped
-- database, use supabase/restore-real-prices.sql (after confirming values with
-- supabase/diagnose-current-prices.sql).
--
-- DO NOT re-add price-wiping logic here. For gateway testing, use a dedicated
-- test project/branch or a discount code — never a global price overwrite on a
-- shared/production database.
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Skipping retired test migration 20260218000000 (€1 price wipe disabled).';
END $$;
