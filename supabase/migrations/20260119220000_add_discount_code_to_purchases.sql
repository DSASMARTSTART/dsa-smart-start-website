-- ============================================
-- Migration: Add discount_code_id to purchases table
-- Date: 2026-01-19
-- Description: Track which discount code was used for each purchase
-- ============================================

-- Add discount_code_id column to purchases table
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL;

-- Add original_amount column to track price before discount
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10, 2);

-- Add discount_amount column to track how much was discounted
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- Add index for discount code lookups
CREATE INDEX IF NOT EXISTS idx_purchases_discount_code ON purchases(discount_code_id);

-- Add comment for documentation
COMMENT ON COLUMN purchases.discount_code_id IS 'Reference to the discount code used for this purchase, if any';
COMMENT ON COLUMN purchases.original_amount IS 'Original price before any discount was applied';
COMMENT ON COLUMN purchases.discount_amount IS 'Amount discounted from the original price';
