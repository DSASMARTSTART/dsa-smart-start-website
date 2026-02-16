-- Migration: Remove guest purchase support
-- Date: 2025-02-16
-- Description: Drops the create_guest_purchase RPC function.
--   All purchases now require an authenticated user. The guest checkout
--   path has been removed from the frontend and edge functions.

DROP FUNCTION IF EXISTS create_guest_purchase(
  TEXT,   -- p_email
  UUID,   -- p_course_id
  DECIMAL,-- p_amount
  DECIMAL,-- p_original_amount
  DECIMAL,-- p_discount_amount
  UUID,   -- p_discount_code_id
  TEXT,   -- p_currency
  TEXT,   -- p_payment_method
  TEXT,   -- p_transaction_id
  BOOLEAN,-- p_teaching_materials_included
  DECIMAL -- p_teaching_materials_price
);

-- Also drop the p_guest_email parameter overload of create_pending_purchase if it exists
-- (the new version no longer accepts p_guest_email)
