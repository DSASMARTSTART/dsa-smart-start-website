-- ============================================
-- INSTALLMENT PAYMENT ELIGIBILITY
-- Date: 2026-06-03
--
-- Adds per-product checkout method eligibility so the existing card/PayPal
-- rails can coexist with the new Raiffeisen/UPC installment rail.
-- ============================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS allowed_payment_methods JSONB NOT NULL DEFAULT '["card","paypal"]'::jsonb;

UPDATE courses
SET allowed_payment_methods = '["card","paypal"]'::jsonb
WHERE allowed_payment_methods IS NULL
   OR jsonb_typeof(allowed_payment_methods) <> 'array'
   OR jsonb_array_length(allowed_payment_methods) = 0;

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_allowed_payment_methods_array;

ALTER TABLE courses
  ADD CONSTRAINT courses_allowed_payment_methods_array
  CHECK (jsonb_typeof(allowed_payment_methods) = 'array');

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS courses_allowed_payment_methods_known_values;

ALTER TABLE courses
  ADD CONSTRAINT courses_allowed_payment_methods_known_values
  CHECK (allowed_payment_methods <@ '["card","paypal","card_installments"]'::jsonb);

CREATE INDEX IF NOT EXISTS idx_courses_allowed_payment_methods
  ON courses USING GIN (allowed_payment_methods);

COMMENT ON COLUMN courses.allowed_payment_methods IS
  'Checkout methods enabled for this product: card, paypal, card_installments.';
