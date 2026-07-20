-- ============================================
-- DSA Smart Start - Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'editor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  avatar_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  pricing JSONB NOT NULL DEFAULT '{"price": 0, "currency": "EUR", "isFree": true}',
  modules JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  draft_data JSONB,
  published_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Product type fields
  product_type TEXT NOT NULL DEFAULT 'learndash' CHECK (product_type IN ('ebook', 'learndash', 'service')),
  target_audience TEXT NOT NULL DEFAULT 'adults_teens' CHECK (target_audience IN ('adults_teens', 'kids')),
  content_format TEXT NOT NULL DEFAULT 'interactive' CHECK (content_format IN ('pdf', 'interactive', 'live', 'hybrid')),
  teaching_materials_price DECIMAL(10, 2),
  teaching_materials_included BOOLEAN NOT NULL DEFAULT false,
  related_materials_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  -- E-book specific fields
  ebook_pdf_url TEXT,
  ebook_page_count INTEGER,
  -- Footer visibility
  show_in_footer BOOLEAN NOT NULL DEFAULT true,
  footer_order INTEGER NOT NULL DEFAULT 0,
  -- Marketing/Extended fields
  learning_outcomes JSONB DEFAULT '[]',
  prerequisites JSONB DEFAULT '[]',
  target_audience_info JSONB,
  instructor JSONB,
  estimated_weekly_hours INTEGER,
  preview_video_url TEXT,
  total_students_enrolled INTEGER DEFAULT 0,
  -- Syllabus content for dynamic syllabus pages
  syllabus_content JSONB,
  -- Payment eligibility
  payment_product_id TEXT,
  payment_provider TEXT DEFAULT 'paypal',
  allowed_payment_methods JSONB NOT NULL DEFAULT '["card","paypal"]'::jsonb
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_product_type ON courses(product_type);
CREATE INDEX IF NOT EXISTS idx_courses_target_audience ON courses(target_audience);
CREATE INDEX IF NOT EXISTS idx_courses_show_in_footer ON courses(show_in_footer);
CREATE INDEX IF NOT EXISTS idx_courses_footer_order ON courses(footer_order);
CREATE INDEX IF NOT EXISTS idx_courses_allowed_payment_methods ON courses USING GIN (allowed_payment_methods);

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_allowed_payment_methods_array;
ALTER TABLE courses ADD CONSTRAINT courses_allowed_payment_methods_array
  CHECK (jsonb_typeof(allowed_payment_methods) = 'array');

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_allowed_payment_methods_known_values;
ALTER TABLE courses ADD CONSTRAINT courses_allowed_payment_methods_known_values
  CHECK (allowed_payment_methods <@ '["card","paypal","card_installments"]'::jsonb);

-- ============================================
-- ENROLLMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked')),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- ============================================
-- PURCHASES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2), -- Price before discount
  discount_amount DECIMAL(10, 2) DEFAULT 0, -- Amount discounted
  -- FK added via ALTER after discount_codes is created (see below) so this file
  -- can be run top-to-bottom on a fresh database without a forward reference.
  discount_code_id UUID,
  currency TEXT NOT NULL DEFAULT 'EUR',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  transaction_id TEXT,
  -- Teaching materials add-on
  teaching_materials_included BOOLEAN DEFAULT false,
  teaching_materials_price DECIMAL(10, 2)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_course ON purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchased_at);
CREATE INDEX IF NOT EXISTS idx_purchases_discount_code ON purchases(discount_code_id);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'course', 'module', 'lesson', 'homework', 'enrollment')),
  entity_id TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ============================================
-- CONTACT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- ============================================
-- DISCOUNT CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount DECIMAL(10, 2), -- Max discount cap for percentage discounts
  min_order_amount DECIMAL(10, 2), -- Minimum order amount required
  max_uses INTEGER, -- NULL means unlimited
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- Now that discount_codes exists, wire the purchases.discount_code_id FK.
-- (Declared inline-less above to keep this file runnable top-to-bottom.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_discount_code_id_fkey') THEN
    ALTER TABLE purchases
      ADD CONSTRAINT purchases_discount_code_id_fkey
      FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  course_name TEXT,
  item_id TEXT,
  item_name TEXT,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name TEXT,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

-- ============================================
-- PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT,
  homework_id TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id, lesson_id, homework_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_course ON progress(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON progress(is_completed);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS HELPER FUNCTION
-- ============================================
-- SECURITY DEFINER function bypasses RLS to avoid infinite recursion
-- when policies on the `users` table subquery `users` itself.
CREATE OR REPLACE FUNCTION public.is_admin_or_editor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND role IN ('admin', 'editor')
  );
$$;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "Public read access for published user info" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all activities" ON activities;
DROP POLICY IF EXISTS "System can insert activities" ON activities;
DROP POLICY IF EXISTS "Users can view own progress" ON progress;
DROP POLICY IF EXISTS "Users can update own progress" ON progress;
DROP POLICY IF EXISTS "Users can modify own progress" ON progress;
DROP POLICY IF EXISTS "Anyone can read active discount codes for validation" ON discount_codes;
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON discount_codes;
DROP POLICY IF EXISTS "System can insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;

-- Users policies
CREATE POLICY "Public read access for published user info" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can create own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (public.is_admin_or_editor());

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (is_published = true OR public.is_admin_or_editor());

CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (public.is_admin_or_editor());

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_admin_or_editor());

CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL USING (public.is_admin_or_editor());

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_admin_or_editor());

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Activities policies
CREATE POLICY "Admins can view all activities" ON activities
  FOR SELECT USING (public.is_admin_or_editor()
  );

CREATE POLICY "System can insert activities" ON activities
  FOR INSERT WITH CHECK (true);

-- Progress policies
CREATE POLICY "Users can view own progress" ON progress
  FOR SELECT USING (user_id::text = auth.uid()::text OR public.is_admin_or_editor());

CREATE POLICY "Users can update own progress" ON progress
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can modify own progress" ON progress
  FOR UPDATE USING (user_id::text = auth.uid()::text);

-- Discount codes policies
CREATE POLICY "Anyone can read active discount codes for validation" ON discount_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Contact messages policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON contact_messages;

CREATE POLICY "Anyone can insert contact messages" ON contact_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON contact_messages
  FOR SELECT USING (public.is_admin_or_editor());

CREATE POLICY "Admins can manage contact messages" ON contact_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to courses table
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment discount code usage (called from client after purchase)
-- Uses SECURITY DEFINER to bypass RLS for this specific operation
CREATE OR REPLACE FUNCTION increment_discount_usage(code_to_update TEXT)
RETURNS void AS $$
BEGIN
  UPDATE discount_codes 
  SET times_used = times_used + 1
  WHERE code = code_to_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Optional - for initial setup)
-- ============================================

-- SECURITY: the default admin/editor seed rows have been REMOVED.
-- Pre-seeding an admin row for an email address is dangerous: because
-- handle_new_user "adopts" an orphaned profile row by email on signup, whoever
-- first registers with admin@eduway.academy / editor@eduway.academy (if the
-- mailbox is not already controlled) would inherit that admin/editor role.
--
-- To create the first admin on a live database, register the account normally,
-- verify its email, then promote it with a one-off statement run by the DB owner:
--   UPDATE users SET role = 'admin' WHERE email = 'you@yourdomain.com';


-- ============================================
-- PAYMENT FLOW HARDENING (mirrored from migrations/20260429000000_payment_flow_hardening.sql)
-- Keep in sync: any change to the migration file must be copied here so fresh
-- installs of schema.sql get the same RPCs/tables/policies.
-- ============================================
-- ============================================
-- PAYMENT FLOW HARDENING — Phase 1 (foundation)
-- Date: 2026-04-29
--
-- Goals (see payment-flow-plan.md Phase 1):
--   1. Backfill any missing columns on `purchases` (status, webhook_*, billing_*).
--   2. Ensure `discount_code_uses` audit table exists (idempotent — older variant
--      with `guest_email` continues to work; new code only writes user rows).
--   3. Ensure `payment_orphans` table exists (idempotent mirror of
--      20260428000000_payment_orphans.sql so this file is self-contained).
--   4. Harden duplicate guard with a unique partial index on
--      (transaction_id, course_id) WHERE transaction_id IS NOT NULL.
--   5. Recreate `confirm_purchase_webhook` as a fully transactional, multi-item
--      RPC that returns {purchases_confirmed, enrollments_created, errors[]}
--      and ABORTS on partial failure (rollback via RAISE EXCEPTION).
--      Records discount_code_uses ONLY when webhook_verified flips false→true
--      (prevents double-counting if the client fallback already touched rows).
--   6. Recreate `confirm_purchases_by_transaction` as the client-side fallback
--      that does NOT increment discount usage.
--   7. Recreate `ensure_enrollment_exists(p_user_id)` so it also normalizes
--      `revoked` enrollments back to `active` when a completed purchase exists.
--   8. Add `get_payment_orphans()` and `resolve_payment_orphan(...)` RPCs
--      (admin-only, SECURITY DEFINER).
--   9. Add `get_course_for_enrolled_user(p_course_id)` RPC so enrolled students
--      can still load courses that have been unpublished.
--  10. Re-assert idempotent SELECT/INSERT RLS policies on purchases and
--      enrollments so this migration alone can self-heal a fresh DB.
--
-- Safe to re-run. No destructive changes.
-- ============================================

-- ============================================
-- 1. BACKFILL MISSING COLUMNS ON purchases
-- ============================================
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_provider_response JSONB,
  ADD COLUMN IF NOT EXISTS billing_name         TEXT,
  ADD COLUMN IF NOT EXISTS billing_address      TEXT,
  ADD COLUMN IF NOT EXISTS billing_city         TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS billing_country      TEXT,
  ADD COLUMN IF NOT EXISTS billing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_pib          TEXT,
  ADD COLUMN IF NOT EXISTS billing_vat_id       TEXT;

CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction_id ON purchases(transaction_id);

-- ============================================
-- 2. discount_code_uses (audit)
-- ============================================
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_code_uses_code     ON discount_code_uses(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_user     ON discount_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_uses_purchase ON discount_code_uses(purchase_id);

ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own discount code uses" ON discount_code_uses;
CREATE POLICY "Users can view own discount code uses" ON discount_code_uses
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all discount code uses" ON discount_code_uses;
CREATE POLICY "Admins can view all discount code uses" ON discount_code_uses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

-- INSERTs are performed by SECURITY DEFINER RPCs (webhook / admin orphan resolve).
-- No client INSERT policy is granted here; existing "Anyone can record discount code use"
-- policy from 20260120001000 remains in place if previously applied.

-- ============================================
-- 3. payment_orphans (idempotent mirror)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_orphans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider                 TEXT NOT NULL,
  transaction_id           TEXT,
  order_identification     TEXT,
  merchant_order_reference TEXT,
  amount                   NUMERIC(10,2),
  currency                 TEXT,
  customer_email           TEXT,
  customer_name            TEXT,
  reason                   TEXT NOT NULL,
  notes                    TEXT,
  provider_response        JSONB NOT NULL,
  resolved                 BOOLEAN NOT NULL DEFAULT false,
  resolved_at              TIMESTAMPTZ,
  resolved_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orphans_resolved ON payment_orphans(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_txn      ON payment_orphans(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_email    ON payment_orphans(customer_email);

ALTER TABLE payment_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can read payment_orphans" ON payment_orphans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Admins can update payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can update payment_orphans" ON payment_orphans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin')
  );

-- INSERTs only by service_role (edge function).

-- ============================================
-- 4. HARDEN DUPLICATE GUARD ON purchases
-- ============================================
-- Drop the older partial index that included `status='pending'` so the new
-- index can also catch double-confirmation across statuses.
DROP INDEX IF EXISTS idx_purchases_unique_pending;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique_txn_course
  ON purchases (transaction_id, course_id)
  WHERE transaction_id IS NOT NULL;

-- ============================================
-- 5. RLS POLICIES — purchases & enrollments (idempotent)
-- ============================================
DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
CREATE POLICY "Users can create own purchases" ON purchases
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can manage purchases" ON purchases;
CREATE POLICY "Admins can manage purchases" ON purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (
    user_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Admins can manage enrollments" ON enrollments;
CREATE POLICY "Admins can manage enrollments" ON enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor'))
  );

-- ============================================
-- 6. confirm_purchase_webhook — transactional multi-item confirmation
-- Returns: { success, purchases_confirmed, enrollments_created, errors[] }
-- Aborts (rollback) on any per-item failure via RAISE EXCEPTION.
-- Records discount_code_uses ONLY when webhook_verified flips false→true.
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchase_webhook(
  p_transaction_id TEXT,
  p_provider_response JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase             RECORD;
  v_purchases_confirmed  INTEGER := 0;
  v_enrollments_created  INTEGER := 0;
  v_errors               JSONB := '[]'::jsonb;
  v_was_unverified       BOOLEAN;
  v_enrollment_inserted  BOOLEAN;
BEGIN
  IF p_transaction_id IS NULL OR length(trim(p_transaction_id)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'purchases_confirmed', 0,
      'enrollments_created', 0,
      'errors', jsonb_build_array('transaction_id is required')
    );
  END IF;

  FOR v_purchase IN
    SELECT id, user_id, course_id, discount_code_id, webhook_verified
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND status IN ('pending', 'completed')
    FOR UPDATE
  LOOP
    BEGIN
      v_was_unverified := COALESCE(v_purchase.webhook_verified, false) = false;

      UPDATE purchases
      SET status = 'completed',
          webhook_verified = true,
          webhook_verified_at = NOW(),
          payment_provider_response = COALESCE(p_provider_response, payment_provider_response)
      WHERE id = v_purchase.id;

      -- Upsert enrollment (active). Reactivate any revoked rows.
      WITH ins AS (
        INSERT INTO enrollments (user_id, course_id, status)
        VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
        ON CONFLICT (user_id, course_id)
        DO UPDATE SET status = 'active', enrolled_at = NOW()
        RETURNING (xmax = 0) AS inserted
      )
      SELECT inserted INTO v_enrollment_inserted FROM ins;

      IF v_enrollment_inserted THEN
        v_enrollments_created := v_enrollments_created + 1;
      END IF;

      -- Audit discount-code use ONLY on the transition to verified
      -- (prevents double-counting if client fallback already ran).
      IF v_was_unverified AND v_purchase.discount_code_id IS NOT NULL THEN
        INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id)
        VALUES (v_purchase.discount_code_id, v_purchase.user_id, v_purchase.id)
        ON CONFLICT DO NOTHING;
      END IF;

      v_purchases_confirmed := v_purchases_confirmed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'purchase_id', v_purchase.id,
        'sqlstate',    SQLSTATE,
        'message',     SQLERRM
      ));
    END;
  END LOOP;

  IF v_purchases_confirmed = 0 AND jsonb_array_length(v_errors) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'purchases_confirmed', 0,
      'enrollments_created', 0,
      'errors', jsonb_build_array('No pending purchase found for transaction_id')
    );
  END IF;

  -- Partial failure → abort everything so the webhook can retry / orphan.
  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'confirm_purchase_webhook partial failure: %', v_errors::text
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchases_confirmed', v_purchases_confirmed,
    'enrollments_created', v_enrollments_created,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. confirm_purchases_by_transaction — client-side fallback
-- Does NOT increment discount usage (webhook is the single source of truth).
-- ============================================
CREATE OR REPLACE FUNCTION confirm_purchases_by_transaction(
  p_transaction_id TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_purchase   RECORD;
  v_confirmed  INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  FOR v_purchase IN
    SELECT id, user_id, course_id
    FROM purchases
    WHERE transaction_id = p_transaction_id
      AND user_id = p_user_id
      AND status = 'pending'
    FOR UPDATE
  LOOP
    UPDATE purchases
    SET status = 'completed',
        -- Intentionally do NOT set webhook_verified here, so when the real
        -- webhook arrives it can still record discount_code_uses exactly once.
        payment_provider_response = COALESCE(payment_provider_response, jsonb_build_object(
          'confirmed_by', 'client_side_fallback',
          'confirmed_at', NOW()::text
        ))
    WHERE id = v_purchase.id;

    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (v_purchase.user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();

    v_confirmed := v_confirmed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'confirmed_count', v_confirmed,
    'transaction_id', p_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. ensure_enrollment_exists — self-healing dashboard
-- Reactivates revoked enrollments AND inserts missing ones whenever a
-- completed purchase exists.
-- ============================================
CREATE OR REPLACE FUNCTION ensure_enrollment_exists(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_repaired INTEGER := 0;
  v_purchase RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_id required', 'repaired_count', 0);
  END IF;

  FOR v_purchase IN
    SELECT DISTINCT p.course_id
    FROM purchases p
    WHERE p.user_id = p_user_id
      AND p.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.user_id = p_user_id
          AND e.course_id = p.course_id
          AND e.status = 'active'
      )
  LOOP
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, v_purchase.course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();

    v_repaired := v_repaired + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'repaired_count', v_repaired
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. get_payment_orphans / resolve_payment_orphan (admin-only)
-- ============================================
CREATE OR REPLACE FUNCTION get_payment_orphans(
  p_include_resolved BOOLEAN DEFAULT false
) RETURNS SETOF payment_orphans AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin','editor')
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM payment_orphans
    WHERE p_include_resolved OR resolved = false
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- p_action: 'confirm' | 'refunded' | 'dismiss'
-- For 'confirm', supply p_user_id + p_course_id so we can create the missing
-- purchase row and enrollment.
CREATE OR REPLACE FUNCTION resolve_payment_orphan(
  p_id UUID,
  p_action TEXT,
  p_user_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_admin_id      UUID;
  v_orphan        RECORD;
  v_purchase_id   UUID;
BEGIN
  v_admin_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = v_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden — admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('confirm', 'refunded', 'dismiss') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_orphan FROM payment_orphans WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orphan not found');
  END IF;

  IF v_orphan.resolved THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orphan already resolved');
  END IF;

  IF p_action = 'confirm' THEN
    IF p_user_id IS NULL OR p_course_id IS NULL THEN
      RAISE EXCEPTION 'p_user_id and p_course_id are required for confirm action'
        USING ERRCODE = '22023';
    END IF;

    -- Create a completed purchase row so the user has audit trail + access.
    INSERT INTO purchases (
      user_id, course_id, amount, original_amount, currency,
      payment_method, transaction_id,
      status, webhook_verified, webhook_verified_at,
      payment_provider_response
    ) VALUES (
      p_user_id, p_course_id,
      COALESCE(v_orphan.amount, 0), COALESCE(v_orphan.amount, 0),
      COALESCE(v_orphan.currency, 'EUR'),
      v_orphan.provider,
      COALESCE(v_orphan.transaction_id, gen_random_uuid()::text),
      'completed', true, NOW(),
      jsonb_build_object(
        'resolved_from_orphan_id', v_orphan.id,
        'orphan_payload', v_orphan.provider_response
      )
    )
    ON CONFLICT (transaction_id, course_id) WHERE transaction_id IS NOT NULL
    DO UPDATE SET status = 'completed',
                  webhook_verified = true,
                  webhook_verified_at = NOW()
    RETURNING id INTO v_purchase_id;

    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, p_course_id, 'active')
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET status = 'active', enrolled_at = NOW();
  END IF;

  UPDATE payment_orphans
  SET resolved         = true,
      resolved_at      = NOW(),
      resolved_by      = v_admin_id,
      resolution_notes = COALESCE(p_notes, resolution_notes)
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'orphan_id', p_id,
    'purchase_id', v_purchase_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. get_course_for_enrolled_user — bypass is_published for enrolled students
-- ============================================
CREATE OR REPLACE FUNCTION get_course_for_enrolled_user(
  p_course_id UUID
) RETURNS SETOF courses AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Admin/editor: always allow
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND role IN ('admin','editor')) THEN
    RETURN QUERY SELECT * FROM courses WHERE id = p_course_id;
    RETURN;
  END IF;

  -- Student: must have an active enrollment
  IF NOT EXISTS (
    SELECT 1 FROM enrollments
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Forbidden — no active enrollment' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY SELECT * FROM courses WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== Payment flow hardening (2026-04-29) applied ===';
  RAISE NOTICE 'Tables: discount_code_uses, payment_orphans (idempotent)';
  RAISE NOTICE 'Columns: purchases.status / webhook_* / billing_* (idempotent)';
  RAISE NOTICE 'Indexes: idx_purchases_unique_txn_course, idx_purchases_status, idx_purchases_transaction_id';
  RAISE NOTICE 'RPCs: confirm_purchase_webhook (transactional), confirm_purchases_by_transaction (no discount inc),';
  RAISE NOTICE '      ensure_enrollment_exists (revoked→active), get_payment_orphans, resolve_payment_orphan,';
  RAISE NOTICE '      get_course_for_enrolled_user';
END $$;
