-- ============================================
-- Migration: Add function to increment discount usage by ID
-- Date: 2026-01-19
-- Description: Creates a function to safely increment discount code usage
-- ============================================

-- Function to increment discount usage by code ID
CREATE OR REPLACE FUNCTION increment_discount_usage_by_id(code_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE discount_codes 
  SET times_used = times_used + 1 
  WHERE id = code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also ensure the original function exists (by code string)
CREATE OR REPLACE FUNCTION increment_discount_usage(code_to_update TEXT)
RETURNS void AS $$
BEGIN
  UPDATE discount_codes 
  SET times_used = times_used + 1 
  WHERE code = code_to_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
