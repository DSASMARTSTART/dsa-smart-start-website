BEGIN;
CREATE FUNCTION public.admin_user_metrics(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='10s' AS $$
DECLARE result jsonb;
BEGIN
 -- Matches the existing staff access to individual user records.
 IF auth.uid() IS NULL OR NOT is_admin_or_editor() THEN RAISE EXCEPTION 'Active staff access required.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_user) THEN RAISE EXCEPTION 'User profile not found.'; END IF;
 WITH enrolled AS (SELECT e.*,c.modules,c.product_type,c.content_format,live_course_program(c.id) AS program FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=p_user AND e.status<>'revoked'),
 items AS (
   SELECT e.course_id,i->>'id' AS item_id,kind FROM enrolled e
   CROSS JOIN LATERAL jsonb_array_elements(coalesce(e.modules,'[]')) m
   CROSS JOIN LATERAL (SELECT value i,'lesson'::text kind FROM jsonb_array_elements(coalesce(m->'lessons','[]')) UNION ALL SELECT value,'homework' FROM jsonb_array_elements(coalesce(m->'homework','[]'))) x
   WHERE i->>'id' IS NOT NULL
 ), metrics AS (
   SELECT e.course_id AS "courseId",CASE WHEN e.program IS NOT NULL THEN 'live' ELSE 'interactive' END AS kind,
    CASE WHEN e.program IS NOT NULL THEN (SELECT count(*) FROM live_bookings b WHERE b.enrollment_id=e.id AND b.status='completed')
    ELSE (SELECT count(*) FROM items i WHERE i.course_id=e.course_id AND EXISTS(SELECT 1 FROM progress p WHERE p.user_id=p_user AND p.course_id=e.course_id AND p.is_completed AND ((i.kind='lesson' AND p.lesson_id=i.item_id) OR (i.kind='homework' AND p.homework_id=i.item_id)))) END AS completed,
    CASE e.program WHEN 'language-lab' THEN 8 WHEN 'language-lab-pro' THEN 30 WHEN 'starter-path' THEN 5 WHEN 'hybrid-pack' THEN 30 ELSE (SELECT count(*) FROM items i WHERE i.course_id=e.course_id) END AS total
   FROM enrolled e WHERE e.product_type<>'ebook' AND (e.program IS NOT NULL OR EXISTS(SELECT 1 FROM items i WHERE i.course_id=e.course_id))
 ), money AS (
   SELECT upper(currency) currency,sum(greatest(0,amount-coalesce(refunded_amount,0))) amount FROM purchases
   WHERE user_id=p_user AND status IN ('completed','refunded') GROUP BY upper(currency)
 ) SELECT jsonb_build_object(
   'progress',(SELECT coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('percentage',least(100,round(100.0*completed/nullif(total,0))))),'[]') FROM metrics m),
   'spentByCurrency',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY currency),'[]') FROM money m),
   'account',(SELECT jsonb_build_object('createdAt',created_at,'confirmedAt',email_confirmed_at,'lastSignInAt',last_sign_in_at) FROM auth.users WHERE id=p_user)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_user_metrics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_user_metrics(uuid) TO authenticated;
COMMIT;
