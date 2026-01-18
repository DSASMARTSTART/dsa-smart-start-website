-- ============================================
-- DSA Smart Start - Database Diagnostic Script
-- ============================================
-- Run this in Supabase SQL Editor to check what's missing
-- Results will show what exists vs what's needed

-- ============================================
-- 1. CHECK TABLES
-- ============================================
SELECT '=== TABLES CHECK ===' as section;

SELECT 
  required_table,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('users'),
    ('courses'),
    ('enrollments'),
    ('purchases'),
    ('audit_logs'),
    ('contact_messages'),
    ('discount_codes'),
    ('activities'),
    ('progress')
) AS required(required_table)
LEFT JOIN information_schema.tables t 
  ON t.table_name = required.required_table 
  AND t.table_schema = 'public'
ORDER BY required_table;

-- ============================================
-- 2. CHECK ROW LEVEL SECURITY ENABLED
-- ============================================
SELECT '=== RLS STATUS ===' as section;

SELECT 
  required_table,
  CASE WHEN p.rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM (
  VALUES 
    ('users'),
    ('courses'),
    ('enrollments'),
    ('purchases'),
    ('audit_logs'),
    ('contact_messages'),
    ('discount_codes'),
    ('activities'),
    ('progress')
) AS required(required_table)
LEFT JOIN pg_tables p 
  ON p.tablename = required.required_table 
  AND p.schemaname = 'public'
ORDER BY required_table;

-- ============================================
-- 3. CHECK POLICIES
-- ============================================
SELECT '=== POLICIES CHECK ===' as section;

SELECT 
  required_policy,
  required_table,
  CASE WHEN pol.policyname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    -- Users policies
    ('Public read access for published user info', 'users'),
    ('Users can update own profile', 'users'),
    ('Admins can manage all users', 'users'),
    -- Courses policies
    ('Anyone can view published courses', 'courses'),
    ('Admins can manage courses', 'courses'),
    -- Enrollments policies
    ('Users can view own enrollments', 'enrollments'),
    ('Admins can manage enrollments', 'enrollments'),
    -- Purchases policies
    ('Users can view own purchases', 'purchases'),
    -- Audit logs policies
    ('Admins can view audit logs', 'audit_logs'),
    ('System can insert audit logs', 'audit_logs'),
    -- Activities policies
    ('Admins can view all activities', 'activities'),
    ('System can insert activities', 'activities'),
    -- Progress policies
    ('Users can view own progress', 'progress'),
    ('Users can update own progress', 'progress'),
    ('Users can modify own progress', 'progress'),
    -- Discount codes policies
    ('Anyone can read active discount codes for validation', 'discount_codes'),
    ('Admins can manage discount codes', 'discount_codes'),
    -- Contact messages policies
    ('Anyone can insert contact messages', 'contact_messages'),
    ('Admins can view contact messages', 'contact_messages'),
    ('Admins can manage contact messages', 'contact_messages')
) AS required(required_policy, required_table)
LEFT JOIN pg_policies pol 
  ON pol.policyname = required.required_policy 
  AND pol.tablename = required.required_table
  AND pol.schemaname = 'public'
ORDER BY required_table, required_policy;

-- ============================================
-- 4. CHECK FUNCTIONS
-- ============================================
SELECT '=== FUNCTIONS CHECK ===' as section;

SELECT 
  required_function,
  CASE WHEN r.routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('update_updated_at_column'),
    ('increment_discount_usage')
) AS required(required_function)
LEFT JOIN information_schema.routines r 
  ON r.routine_name = required.required_function 
  AND r.routine_schema = 'public'
ORDER BY required_function;

-- ============================================
-- 5. CHECK TRIGGERS
-- ============================================
SELECT '=== TRIGGERS CHECK ===' as section;

SELECT 
  required_trigger,
  required_table,
  CASE WHEN t.trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('update_users_updated_at', 'users'),
    ('update_courses_updated_at', 'courses')
) AS required(required_trigger, required_table)
LEFT JOIN information_schema.triggers t 
  ON t.trigger_name = required.required_trigger 
  AND t.event_object_table = required.required_table
  AND t.trigger_schema = 'public'
ORDER BY required_table;

-- ============================================
-- 6. CHECK INDEXES
-- ============================================
SELECT '=== INDEXES CHECK ===' as section;

SELECT 
  required_index,
  CASE WHEN i.indexname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('idx_users_email'),
    ('idx_users_role'),
    ('idx_users_status'),
    ('idx_courses_level'),
    ('idx_courses_published'),
    ('idx_enrollments_user'),
    ('idx_enrollments_course'),
    ('idx_enrollments_status'),
    ('idx_purchases_user'),
    ('idx_purchases_course'),
    ('idx_purchases_date'),
    ('idx_audit_logs_entity'),
    ('idx_audit_logs_admin'),
    ('idx_audit_logs_timestamp'),
    ('idx_contact_messages_status'),
    ('idx_contact_messages_created'),
    ('idx_discount_codes_code'),
    ('idx_discount_codes_active'),
    ('idx_activities_user'),
    ('idx_activities_course'),
    ('idx_activities_timestamp'),
    ('idx_progress_user'),
    ('idx_progress_course'),
    ('idx_progress_completed')
) AS required(required_index)
LEFT JOIN pg_indexes i 
  ON i.indexname = required.required_index 
  AND i.schemaname = 'public'
ORDER BY required_index;

-- ============================================
-- 7. SUMMARY
-- ============================================
SELECT '=== SUMMARY ===' as section;

SELECT 'Tables' as category, 
  COUNT(*) FILTER (WHERE t.table_name IS NOT NULL) as found,
  9 as expected,
  CASE WHEN COUNT(*) FILTER (WHERE t.table_name IS NOT NULL) = 9 
    THEN '✅ ALL GOOD' ELSE '❌ MISSING TABLES' END as status
FROM (VALUES ('users'),('courses'),('enrollments'),('purchases'),('audit_logs'),
  ('contact_messages'),('discount_codes'),('activities'),('progress')) AS r(tbl)
LEFT JOIN information_schema.tables t ON t.table_name = r.tbl AND t.table_schema = 'public'

UNION ALL

SELECT 'Functions' as category,
  COUNT(*) FILTER (WHERE r.routine_name IS NOT NULL) as found,
  2 as expected,
  CASE WHEN COUNT(*) FILTER (WHERE r.routine_name IS NOT NULL) = 2 
    THEN '✅ ALL GOOD' ELSE '❌ MISSING FUNCTIONS' END as status
FROM (VALUES ('update_updated_at_column'),('increment_discount_usage')) AS req(fn)
LEFT JOIN information_schema.routines r ON r.routine_name = req.fn AND r.routine_schema = 'public'

UNION ALL

SELECT 'Policies' as category,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as found,
  20 as expected,
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 20 
    THEN '✅ ALL GOOD' ELSE '⚠️ CHECK POLICIES' END as status;

-- ============================================
-- 8. SHOW ANY EXTRA/UNEXPECTED POLICIES
-- ============================================
SELECT '=== EXTRA POLICIES (not in schema) ===' as section;

SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
AND policyname NOT IN (
  'Public read access for published user info',
  'Users can update own profile',
  'Admins can manage all users',
  'Anyone can view published courses',
  'Admins can manage courses',
  'Users can view own enrollments',
  'Admins can manage enrollments',
  'Users can view own purchases',
  'Admins can view audit logs',
  'System can insert audit logs',
  'Admins can view all activities',
  'System can insert activities',
  'Users can view own progress',
  'Users can update own progress',
  'Users can modify own progress',
  'Anyone can read active discount codes for validation',
  'Admins can manage discount codes',
  'Anyone can insert contact messages',
  'Admins can view contact messages',
  'Admins can manage contact messages'
)
ORDER BY tablename, policyname;
