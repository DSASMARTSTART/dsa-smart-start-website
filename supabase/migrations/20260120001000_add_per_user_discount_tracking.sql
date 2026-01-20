-- Migration: Add per-user discount code tracking
-- Date: 2026-01-20
-- Purpose: Track which users have used which discount codes to prevent abuse

-- ============================================
-- DISCOUNT_CODE_USES TABLE
-- ============================================
-- Tracks each use of a discount code by a user
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT, -- For guest checkouts (users without accounts)
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Must have either user_id OR guest_email
  CONSTRAINT user_or_guest CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code ON discount_code_uses(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_user ON discount_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_email ON discount_code_uses(guest_email);

-- Unique constraint to prevent same user using same code twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_code_uses_unique_user 
  ON discount_code_uses(discount_code_id, user_id) 
  WHERE user_id IS NOT NULL;

-- Unique constraint to prevent same guest email using same code twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_code_uses_unique_guest 
  ON discount_code_uses(discount_code_id, guest_email) 
  WHERE guest_email IS NOT NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own discount code uses
DROP POLICY IF EXISTS "Users can view own discount code uses" ON discount_code_uses;
CREATE POLICY "Users can view own discount code uses" ON discount_code_uses
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow inserting discount code uses during checkout (both authenticated and anon)
DROP POLICY IF EXISTS "Anyone can record discount code use" ON discount_code_uses;
CREATE POLICY "Anyone can record discount code use" ON discount_code_uses
  FOR INSERT WITH CHECK (true);

-- Policy: Admins can view all discount code uses
DROP POLICY IF EXISTS "Admins can view all discount code uses" ON discount_code_uses;
CREATE POLICY "Admins can view all discount code uses" ON discount_code_uses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- HELPER FUNCTION: Check if user can use discount code
-- ============================================
CREATE OR REPLACE FUNCTION check_discount_code_available(
  p_discount_code_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_used BOOLEAN;
BEGIN
  -- Check if this user/email has already used this code
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM discount_code_uses 
      WHERE discount_code_id = p_discount_code_id 
      AND user_id = p_user_id
    ) INTO v_already_used;
  ELSIF p_guest_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM discount_code_uses 
      WHERE discount_code_id = p_discount_code_id 
      AND guest_email = LOWER(p_guest_email)
    ) INTO v_already_used;
  ELSE
    -- Neither provided, return false (cannot validate)
    RETURN FALSE;
  END IF;
  
  -- Return TRUE if NOT already used (code is available)
  RETURN NOT v_already_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Record discount code use
-- ============================================
CREATE OR REPLACE FUNCTION record_discount_code_use(
  p_discount_code_id UUID,
  p_purchase_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert the usage record
  INSERT INTO discount_code_uses (discount_code_id, user_id, guest_email, purchase_id)
  VALUES (p_discount_code_id, p_user_id, LOWER(p_guest_email), p_purchase_id);
  
  -- Also increment the times_used counter on the discount code
  UPDATE discount_codes 
  SET times_used = times_used + 1 
  WHERE id = p_discount_code_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    -- User has already used this code
    RETURN FALSE;
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
