-- ============================================
-- PERSIST FX RATE + INSTALLMENT PLAN ON PURCHASES (audit B7 / I3 / I4)
-- Date: 2026-07-06
--
-- The EUR→RSD rate used to charge a card/installment order was not stored on the
-- purchase, so the exact charged amount could not be reproduced for reconciliation
-- or invoicing. Add:
--   * currency_exchange_rate — the EUR→RSD rate applied at charge time.
--   * installment_plan        — optional structured info about the bank-managed
--                               installment plan (e.g. number of months) captured
--                               from the UPC notify, for customer receipts.
-- Both are nullable and backward-compatible.
-- ============================================

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS currency_exchange_rate NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS installment_plan       JSONB;

COMMENT ON COLUMN purchases.currency_exchange_rate IS
  'EUR→RSD rate applied when the order was charged (audit B7). Null for EUR-native charges.';
COMMENT ON COLUMN purchases.installment_plan IS
  'Optional bank-managed installment details captured from the UPC notify (audit I4).';
