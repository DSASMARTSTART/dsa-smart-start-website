-- ============================================
-- PAYMENT ORPHANS — alert table for webhooks that arrive without a matching purchase row
-- Date: 2026-04-28
--
-- When a payment webhook (RaiAccept or PayPal) reports a successful charge but
-- no `purchases` row can be matched (e.g. because create-raiaccept-session
-- silently failed to create the pending row, or a transaction_id mismatch),
-- the webhook inserts a row here so admins can manually reconcile and refund
-- or grant access without losing the event.
--
-- Visible in Admin → Transactions (orphan banner) — see follow-up UI work.
-- ============================================

CREATE TABLE IF NOT EXISTS payment_orphans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  provider          TEXT NOT NULL,                -- 'raiaccept' | 'paypal'
  transaction_id    TEXT,                         -- best-effort id we tried to match on
  order_identification TEXT,                      -- provider's own order id (e.g. RaiAccept orderIdentification)
  merchant_order_reference TEXT,                  -- our orderId echoed back by the provider
  amount            NUMERIC(10,2),
  currency          TEXT,
  customer_email    TEXT,
  customer_name     TEXT,

  reason            TEXT NOT NULL,                -- short machine-friendly reason code
  notes             TEXT,                         -- free-form human-readable detail
  provider_response JSONB NOT NULL,               -- full webhook payload for forensics

  resolved          BOOLEAN NOT NULL DEFAULT false,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orphans_resolved   ON payment_orphans(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_txn        ON payment_orphans(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_orphans_email      ON payment_orphans(customer_email);

ALTER TABLE payment_orphans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can read payment_orphans" ON payment_orphans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin','editor'))
  );

DROP POLICY IF EXISTS "Admins can update payment_orphans" ON payment_orphans;
CREATE POLICY "Admins can update payment_orphans" ON payment_orphans
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- INSERT is performed only by the service role (edge function); no client INSERT policy.

COMMENT ON TABLE payment_orphans IS
  'Webhook events that confirmed a charge but could not be matched to a purchases row. Manual admin reconciliation required.';
