-- ============================================
-- INVOICING SYSTEM
-- Date: 2026-04-21
--
-- Adds:
--   1. app_settings table (singleton row) — company info, accountant emails,
--      VAT rate, EUR↔RSD rate, sender email configuration.
--   2. Billing snapshot columns on purchases (address, country, company, PIB).
--   3. invoices table — one row per confirmed purchase, immutable snapshot
--      of buyer + seller + line items + totals + dual currency.
--   4. next_invoice_number(year) — atomic sequential numbering per year
--      (format YYYY-NNNN), row-locked to prevent duplicates.
--   5. Extended create_pending_purchase to accept billing details.
-- ============================================

-- ─────────────────────────────────────────────
-- 1. APP SETTINGS (singleton)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),

  -- Seller / Company
  company_legal_name   TEXT NOT NULL DEFAULT 'Eduway Academy',
  company_address      TEXT NOT NULL DEFAULT '',
  company_city         TEXT NOT NULL DEFAULT 'Belgrade',
  company_postal_code  TEXT NOT NULL DEFAULT '',
  company_country      TEXT NOT NULL DEFAULT 'Serbia',
  company_pib          TEXT NOT NULL DEFAULT '',
  company_maticni_broj TEXT NOT NULL DEFAULT '',
  company_vat_id       TEXT NOT NULL DEFAULT '',
  company_phone        TEXT NOT NULL DEFAULT '',
  company_email        TEXT NOT NULL DEFAULT 'office@eduway.academy',
  company_iban         TEXT NOT NULL DEFAULT '',
  company_bank_name    TEXT NOT NULL DEFAULT '',

  -- Invoicing
  vat_registered       BOOLEAN NOT NULL DEFAULT true,
  vat_rate             NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  eur_to_rsd_rate      NUMERIC(10,4) NOT NULL DEFAULT 117.15,
  invoice_number_prefix TEXT NOT NULL DEFAULT '',  -- optional, e.g. "EDU-"
  accountant_emails    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  invoice_email_from   TEXT NOT NULL DEFAULT 'Eduway Academy <noreply@eduway.academy>',
  invoice_email_reply_to TEXT NOT NULL DEFAULT 'office@eduway.academy',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Seed the singleton row
INSERT INTO app_settings (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_settings" ON app_settings;
CREATE POLICY "Anyone can read app_settings" ON app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update app_settings" ON app_settings;
CREATE POLICY "Admins can update app_settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ─────────────────────────────────────────────
-- 2. BILLING COLUMNS ON PURCHASES
-- ─────────────────────────────────────────────
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS billing_name         TEXT,
  ADD COLUMN IF NOT EXISTS billing_address      TEXT,
  ADD COLUMN IF NOT EXISTS billing_city         TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS billing_country      TEXT,
  ADD COLUMN IF NOT EXISTS billing_company_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_pib          TEXT,
  ADD COLUMN IF NOT EXISTS billing_vat_id       TEXT;

-- ─────────────────────────────────────────────
-- 3. INVOICES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Numbering
  invoice_number TEXT UNIQUE NOT NULL,      -- e.g. "2026-0001"
  invoice_year   INTEGER NOT NULL,
  invoice_sequence INTEGER NOT NULL,
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to purchase (one invoice per transaction_id grouping, but store per-purchase)
  -- NOTE: we issue ONE invoice per transaction_id (cart order), not per purchase row.
  transaction_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Buyer snapshot (immutable — copied at issue time)
  buyer_name         TEXT NOT NULL,
  buyer_email        TEXT NOT NULL,
  buyer_address      TEXT,
  buyer_city         TEXT,
  buyer_postal_code  TEXT,
  buyer_country      TEXT,
  buyer_company_name TEXT,
  buyer_pib          TEXT,
  buyer_vat_id       TEXT,

  -- Seller snapshot at issue time (JSONB for forward compat)
  seller_snapshot JSONB NOT NULL,

  -- Line items snapshot
  line_items JSONB NOT NULL,  -- [{ description, qty, unit_price_net, vat_rate, vat_amount, total }]

  -- Totals (stored in EUR always for reporting; RSD computed via rate)
  currency_charged   TEXT NOT NULL,         -- 'EUR' or 'RSD' — what the card was actually charged in
  exchange_rate      NUMERIC(10,4) NOT NULL,-- EUR→RSD rate snapshot
  subtotal_eur       NUMERIC(10,2) NOT NULL,
  vat_amount_eur     NUMERIC(10,2) NOT NULL,
  total_eur          NUMERIC(10,2) NOT NULL,
  subtotal_rsd       NUMERIC(12,2) NOT NULL,
  vat_amount_rsd     NUMERIC(12,2) NOT NULL,
  total_rsd          NUMERIC(12,2) NOT NULL,
  vat_rate           NUMERIC(5,2) NOT NULL,
  vat_registered     BOOLEAN NOT NULL,

  -- Payment info
  payment_method     TEXT,
  paid_at            TIMESTAMPTZ,

  -- Delivery tracking
  email_sent_to_customer_at   TIMESTAMPTZ,
  email_sent_to_accountant_at TIMESTAMPTZ,
  email_error                 TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_transaction    ON invoices(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user           ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_year_sequence  ON invoices(invoice_year, invoice_sequence);
CREATE INDEX IF NOT EXISTS idx_invoices_issued         ON invoices(issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_year_seq_unique
  ON invoices(invoice_year, invoice_sequence);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own invoices" ON invoices;
CREATE POLICY "Users can read own invoices" ON invoices
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','editor'))
  );

-- Only service role inserts/updates (via edge function). No client INSERT policy.

-- ─────────────────────────────────────────────
-- 4. NEXT INVOICE NUMBER (per-year sequential, lock-safe)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION next_invoice_number(p_year INTEGER)
RETURNS TABLE(invoice_number TEXT, year INTEGER, sequence INTEGER) AS $$
DECLARE
  v_max INTEGER;
  v_next INTEGER;
  v_prefix TEXT;
BEGIN
  -- Lock the app_settings row to serialize number allocation globally
  -- (prefix may change year-to-year; this avoids races)
  SELECT invoice_number_prefix INTO v_prefix FROM app_settings WHERE id='singleton' FOR UPDATE;

  -- Find max sequence for this year. Using advisory approach with the row lock
  -- above makes this safe against concurrent calls.
  SELECT COALESCE(MAX(invoice_sequence), 0) INTO v_max
    FROM invoices WHERE invoice_year = p_year;

  v_next := v_max + 1;

  RETURN QUERY SELECT
    COALESCE(v_prefix, '') || p_year::TEXT || '-' || LPAD(v_next::TEXT, 4, '0'),
    p_year,
    v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 5. EXTEND create_pending_purchase with billing fields
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_pending_purchase(
  p_user_id UUID,
  p_course_id UUID,
  p_amount DECIMAL,
  p_original_amount DECIMAL,
  p_discount_amount DECIMAL DEFAULT 0,
  p_discount_code_id UUID DEFAULT NULL,
  p_currency TEXT DEFAULT 'EUR',
  p_payment_method TEXT DEFAULT 'card',
  p_transaction_id TEXT DEFAULT NULL,
  p_teaching_materials_included BOOLEAN DEFAULT false,
  p_teaching_materials_price DECIMAL DEFAULT 0,
  p_billing_name TEXT DEFAULT NULL,
  p_billing_address TEXT DEFAULT NULL,
  p_billing_city TEXT DEFAULT NULL,
  p_billing_postal_code TEXT DEFAULT NULL,
  p_billing_country TEXT DEFAULT NULL,
  p_billing_company_name TEXT DEFAULT NULL,
  p_billing_pib TEXT DEFAULT NULL,
  p_billing_vat_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_purchase_id UUID;
  v_existing_enrollment BOOLEAN;
  v_existing_purchase UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'active'
  ) INTO v_existing_enrollment;

  IF v_existing_enrollment THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already enrolled', 'already_enrolled', true);
  END IF;

  IF p_transaction_id IS NOT NULL THEN
    SELECT id INTO v_existing_purchase
      FROM purchases
      WHERE transaction_id = p_transaction_id
        AND course_id = p_course_id
        AND status = 'pending'
      LIMIT 1;

    IF v_existing_purchase IS NOT NULL THEN
      -- Update billing fields on existing pending row (idempotent billing capture)
      UPDATE purchases SET
        billing_name         = COALESCE(p_billing_name, billing_name),
        billing_address      = COALESCE(p_billing_address, billing_address),
        billing_city         = COALESCE(p_billing_city, billing_city),
        billing_postal_code  = COALESCE(p_billing_postal_code, billing_postal_code),
        billing_country      = COALESCE(p_billing_country, billing_country),
        billing_company_name = COALESCE(p_billing_company_name, billing_company_name),
        billing_pib          = COALESCE(p_billing_pib, billing_pib),
        billing_vat_id       = COALESCE(p_billing_vat_id, billing_vat_id)
      WHERE id = v_existing_purchase;

      RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_existing_purchase,
        'already_exists', true
      );
    END IF;
  END IF;

  INSERT INTO purchases (
    user_id, course_id, amount, original_amount, discount_amount,
    discount_code_id, currency, payment_method, transaction_id,
    teaching_materials_included, teaching_materials_price,
    status, webhook_verified,
    billing_name, billing_address, billing_city, billing_postal_code,
    billing_country, billing_company_name, billing_pib, billing_vat_id
  ) VALUES (
    p_user_id, p_course_id, p_amount, p_original_amount, p_discount_amount,
    p_discount_code_id, p_currency, p_payment_method,
    COALESCE(p_transaction_id, gen_random_uuid()::text),
    p_teaching_materials_included, p_teaching_materials_price,
    'pending', false,
    p_billing_name, p_billing_address, p_billing_city, p_billing_postal_code,
    p_billing_country, p_billing_company_name, p_billing_pib, p_billing_vat_id
  )
  RETURNING id INTO v_purchase_id;

  IF p_discount_code_id IS NOT NULL THEN
    INSERT INTO discount_code_uses (discount_code_id, user_id, purchase_id)
    VALUES (p_discount_code_id, p_user_id, v_purchase_id)
    ON CONFLICT DO NOTHING;

    UPDATE discount_codes SET times_used = times_used + 1 WHERE id = p_discount_code_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 6. HELPER: update billing on existing pending purchases by transaction_id
-- (used by PayPal client-side path when billing captured after pending row exists)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_purchase_billing(
  p_transaction_id TEXT,
  p_user_id UUID,
  p_billing_name TEXT,
  p_billing_address TEXT,
  p_billing_city TEXT,
  p_billing_postal_code TEXT,
  p_billing_country TEXT,
  p_billing_company_name TEXT,
  p_billing_pib TEXT,
  p_billing_vat_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE purchases SET
    billing_name         = p_billing_name,
    billing_address      = p_billing_address,
    billing_city         = p_billing_city,
    billing_postal_code  = p_billing_postal_code,
    billing_country      = p_billing_country,
    billing_company_name = p_billing_company_name,
    billing_pib          = p_billing_pib,
    billing_vat_id       = p_billing_vat_id
  WHERE transaction_id = p_transaction_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE app_settings IS 'Singleton config for invoicing, company info, and email routing.';
COMMENT ON TABLE invoices IS 'Immutable invoice records. One row per transaction (cart order).';
COMMENT ON FUNCTION next_invoice_number IS 'Returns next sequential invoice number for a given year, lock-safe.';
