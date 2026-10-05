-- Disposable database only. Minimal schema matching the payment RPC contract.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  transaction_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'failed', 'completed', 'refunded')),
  discount_code_id UUID,
  webhook_verified BOOLEAN NOT NULL DEFAULT false,
  webhook_verified_at TIMESTAMPTZ,
  payment_provider_response JSONB
);
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  status TEXT NOT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
-- Deliberately no uniqueness constraint: the production table has none.
CREATE TABLE public.discount_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL,
  user_id UUID NOT NULL,
  purchase_id UUID NOT NULL
);
