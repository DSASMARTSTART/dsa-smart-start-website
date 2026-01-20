-- ============================================
-- DSA Smart Start - Add Wizard State Fields
-- For multi-step course creation wizard
-- Date: 2026-01-20
-- ============================================

-- Step 1: Add wizard_step field to track current step (1-4)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'wizard_step') THEN
    ALTER TABLE courses ADD COLUMN wizard_step INTEGER NOT NULL DEFAULT 1 CHECK (wizard_step >= 1 AND wizard_step <= 4);
  END IF;
END $$;

-- Step 2: Add steps_completed JSONB field to track which steps are complete
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'steps_completed') THEN
    ALTER TABLE courses ADD COLUMN steps_completed JSONB NOT NULL DEFAULT '{"metadata": false, "pricing": false, "syllabus": false, "content": false}';
  END IF;
END $$;

-- Step 3: Add wizard_completed flag (true when all 4 steps done, required for publishing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'wizard_completed') THEN
    ALTER TABLE courses ADD COLUMN wizard_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Step 4: Add payment_product_id for PayPal/payment provider integration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'payment_product_id') THEN
    ALTER TABLE courses ADD COLUMN payment_product_id TEXT;
  END IF;
END $$;

-- Step 5: Add payment_provider field (paypal, raiffeisen, etc.)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'payment_provider') THEN
    ALTER TABLE courses ADD COLUMN payment_provider TEXT DEFAULT 'paypal';
  END IF;
END $$;

-- Step 6: Create index for filtering drafts/incomplete courses
CREATE INDEX IF NOT EXISTS idx_courses_wizard_completed ON courses(wizard_completed);
CREATE INDEX IF NOT EXISTS idx_courses_wizard_step ON courses(wizard_step);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN courses.wizard_step IS 'Current step in the 4-step creation wizard (1=Metadata, 2=Pricing, 3=Syllabus, 4=Content)';
COMMENT ON COLUMN courses.steps_completed IS 'JSON tracking which wizard steps are completed: {metadata, pricing, syllabus, content}';
COMMENT ON COLUMN courses.wizard_completed IS 'True when all 4 wizard steps are completed - required before publishing';
COMMENT ON COLUMN courses.payment_product_id IS 'Product ID from payment provider (PayPal/Raiffeisen) for checkout integration';
COMMENT ON COLUMN courses.payment_provider IS 'Which payment provider handles this course: paypal, raiffeisen';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'Wizard state fields migration completed successfully!';
END $$;
