-- ============================================
-- FIX: "Database error saving new user" on registration
-- Date: 2026-02-16
--
-- Root cause: The handle_new_user() trigger only handles id conflicts
-- (ON CONFLICT (id) DO NOTHING) but NOT email uniqueness conflicts.
-- If a public.users row exists with the same email but a different id
-- (e.g. from seed data, manual insert, or a previously deleted auth user),
-- the trigger throws a unique constraint violation on email → GoTrue
-- surfaces the generic "Database error saving new user" message.
--
-- Fix:
--   1. Before inserting, adopt any orphaned public.users row (same email,
--      different id) by updating its id to match the new auth user.
--   2. Use ON CONFLICT (id) DO UPDATE to refresh stale data.
--   3. Wrap in EXCEPTION handler so auth signup never fails due to the
--      profile trigger — worst case the profile is created later.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Adopt orphaned profile: same email but different id
  -- (happens when auth user was deleted but public.users row remained)
  UPDATE public.users
  SET id = NEW.id,
      name = COALESCE(v_name, name),
      status = 'active',
      updated_at = NOW()
  WHERE email = NEW.email AND id != NEW.id;

  -- Insert new profile (or update existing if id already present)
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    'student',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    status = 'active',
    updated_at = NOW();

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Never block auth signup — profile can be created later
    RAISE WARNING 'handle_new_user trigger failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the INSERT policy exists for users table
-- (belt-and-suspenders — trigger uses SECURITY DEFINER so it bypasses RLS,
--  but direct signUp-path profile creation in AuthContext needs the policy)
DROP POLICY IF EXISTS "Users can create own profile" ON users;
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id::text);

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Public read access for published user info" ON users;
CREATE POLICY "Public read access for published user info" ON users
  FOR SELECT USING (true);

-- Ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

DO $$
BEGIN
  RAISE NOTICE 'handle_new_user trigger fix applied:';
  RAISE NOTICE '+ Handles email uniqueness conflicts (orphaned profiles)';
  RAISE NOTICE '+ ON CONFLICT (id) DO UPDATE instead of DO NOTHING';
  RAISE NOTICE '+ EXCEPTION handler prevents auth signup from failing';
  RAISE NOTICE '+ RLS policies for users table re-applied';
END $$;
