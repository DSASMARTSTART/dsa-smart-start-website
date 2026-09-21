-- Additional production columns needed by analytics in the disposable test database.
ALTER TABLE auth.users ADD COLUMN created_at timestamptz DEFAULT now(),ADD COLUMN email_confirmed_at timestamptz,ADD COLUMN last_sign_in_at timestamptz;
ALTER TABLE public.users ADD COLUMN created_via_guest_checkout boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN modules jsonb DEFAULT '[]',ADD COLUMN is_published boolean DEFAULT true;
ALTER TABLE public.enrollments ADD COLUMN enrolled_at timestamptz DEFAULT now(),ADD COLUMN completed_at timestamptz;
ALTER TABLE public.purchases ADD COLUMN amount numeric DEFAULT 0,ADD COLUMN refunded_amount numeric DEFAULT 0,ADD COLUMN currency text DEFAULT 'EUR',ADD COLUMN purchased_at timestamptz DEFAULT now(),ADD COLUMN payment_method text DEFAULT 'test';
CREATE TABLE public.progress(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,course_id uuid,lesson_id text,homework_id text,is_completed boolean,completed_at timestamptz);
CREATE TABLE public.quiz_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,course_id uuid,completed_at timestamptz);
CREATE TABLE public.payment_orphans(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),resolved boolean DEFAULT false);
