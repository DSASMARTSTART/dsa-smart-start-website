BEGIN;
-- Internal reporting views are deliberately unavailable through the client API.
-- No browser-supplied role or user ID is trusted by the reporting function.
CREATE VIEW public.admin_analytics_students AS
 SELECT u.id,u.name,u.email,u.status,a.created_at,a.email_confirmed_at,a.last_sign_in_at,
 coalesce(u.created_via_guest_checkout,false) AS guest_checkout
 FROM public.users u JOIN auth.users a ON a.id=u.id
 WHERE u.role='student' AND NOT EXISTS(SELECT 1 FROM public.live_teachers t WHERE t.user_id=u.id);
CREATE VIEW public.admin_analytics_activity AS
 SELECT p.user_id,p.course_id,p.completed_at AS occurred_at,'learning_item'::text AS kind
 FROM public.progress p WHERE p.is_completed AND p.completed_at IS NOT NULL
 UNION ALL SELECT q.user_id,q.course_id,q.completed_at,'quiz' FROM public.quiz_results q
 UNION ALL SELECT b.user_id,b.course_id,b.created_at,'booking' FROM public.live_bookings b
 UNION ALL SELECT b.user_id,b.course_id,b.updated_at,'attendance' FROM public.live_bookings b WHERE b.status='completed';
REVOKE ALL ON public.admin_analytics_students,public.admin_analytics_activity FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_analytics_snapshot(p_days integer DEFAULT 30,p_currency text DEFAULT NULL,p_timezone text DEFAULT 'Europe/Belgrade')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='15s' AS $$
DECLARE starts timestamptz; prior timestamptz; ends timestamptz:=now(); result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_active_administrator() THEN RAISE EXCEPTION 'Active administrator access required.' USING ERRCODE='42501'; END IF;
 IF p_days NOT IN (7,30,90) OR p_days IS NULL THEN RAISE EXCEPTION 'Choose 7, 30 or 90 days.'; END IF;
 IF p_currency IS NULL THEN SELECT upper(currency) INTO p_currency FROM purchases WHERE status IN ('completed','refunded') AND currency~'^[A-Za-z]{3}$' GROUP BY upper(currency) ORDER BY count(*) DESC,upper(currency) LIMIT 1; p_currency:=coalesce(p_currency,'EUR'); END IF;
 IF p_currency !~ '^[A-Z]{3}$' OR p_currency IS NULL THEN RAISE EXCEPTION 'Invalid reporting currency.'; END IF;
 IF p_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid reporting timezone.'; END IF;
 starts:=((ends AT TIME ZONE p_timezone)::date-(p_days-1))::timestamp AT TIME ZONE p_timezone;
 prior:=((ends AT TIME ZONE p_timezone)::date-(2*p_days-1))::timestamp AT TIME ZONE p_timezone;
 WITH students AS MATERIALIZED (SELECT * FROM admin_analytics_students),
 events AS MATERIALIZED (SELECT a.* FROM admin_analytics_activity a JOIN students s ON s.id=a.user_id WHERE a.occurred_at>=prior AND a.occurred_at<=ends),
 payments AS MATERIALIZED (
   SELECT p.*,greatest(0,p.amount-coalesce(p.refunded_amount,0)) AS net
   FROM purchases p WHERE p.status IN ('completed','refunded') AND upper(p.currency)=p_currency AND p.purchased_at<=ends
 ),
 paid AS MATERIALIZED (SELECT * FROM payments WHERE purchased_at>=starts),
 cohort AS MATERIALIZED (SELECT * FROM students WHERE created_at>=starts AND created_at<=ends),
 daily AS (
   SELECT d::date AS day,
    (SELECT count(*) FROM cohort s WHERE (s.created_at AT TIME ZONE p_timezone)::date=d::date) AS registrations,
    (SELECT count(*) FROM paid p WHERE (p.purchased_at AT TIME ZONE p_timezone)::date=d::date) AS orders,
    (SELECT coalesce(sum(net),0) FROM paid p WHERE (p.purchased_at AT TIME ZONE p_timezone)::date=d::date) AS revenue,
    (SELECT count(*) FROM events a WHERE a.kind='learning_item' AND (a.occurred_at AT TIME ZONE p_timezone)::date=d::date) AS learning_items
   FROM generate_series((starts AT TIME ZONE p_timezone)::date,(ends AT TIME ZONE p_timezone)::date,interval '1 day') d
 ),
 course_items AS MATERIALIZED (
   SELECT c.id AS course_id,item->>'id' AS item_id,kind FROM courses c
   CROSS JOIN LATERAL jsonb_array_elements(coalesce(c.modules,'[]')) m
   CROSS JOIN LATERAL (
     SELECT value AS item,'lesson'::text AS kind FROM jsonb_array_elements(coalesce(m->'lessons','[]'))
     UNION ALL SELECT value,'homework' FROM jsonb_array_elements(coalesce(m->'homework','[]'))
   ) items WHERE item->>'id' IS NOT NULL
 ),
 course_metrics AS (
   SELECT c.id,c.title,c.level,c.product_type,c.content_format,
    (SELECT count(*) FROM enrollments e JOIN students s ON s.id=e.user_id WHERE e.course_id=c.id AND e.status='active') AS active_enrollments,
    (SELECT count(*) FROM enrollments e JOIN students s ON s.id=e.user_id WHERE e.course_id=c.id AND e.enrolled_at>=starts AND e.enrolled_at<=ends) AS new_enrollments,
    (SELECT count(*) FROM paid p WHERE p.course_id=c.id) AS orders,
    (SELECT coalesce(sum(net),0) FROM paid p WHERE p.course_id=c.id) AS revenue,
    (SELECT count(*) FROM course_items ci WHERE ci.course_id=c.id) AS learning_items,
    CASE WHEN public.live_course_program(c.id) IS NULL AND c.product_type<>'ebook' AND EXISTS(SELECT 1 FROM course_items ci WHERE ci.course_id=c.id) THEN (
      SELECT round(avg(least(100,100.0*(SELECT count(*) FROM course_items ci WHERE ci.course_id=c.id AND EXISTS(
        SELECT 1 FROM progress pr WHERE pr.user_id=e.user_id AND pr.course_id=c.id AND pr.is_completed
        AND ((ci.kind='lesson' AND pr.lesson_id=ci.item_id) OR (ci.kind='homework' AND pr.homework_id=ci.item_id))
      ))/nullif((SELECT count(*) FROM course_items ci WHERE ci.course_id=c.id),0))),1)
      FROM enrollments e JOIN students s ON s.id=e.user_id WHERE e.course_id=c.id AND e.status='active'
    ) ELSE NULL END AS average_progress,
    (SELECT count(*) FROM live_assets a WHERE a.course_id=c.id AND a.kind='material' AND a.state='ready') AS materials,
    (SELECT count(*) FROM live_bookings b WHERE b.course_id=c.id AND b.starts_at>=starts AND b.starts_at<=ends AND b.status='completed') AS live_attendances
   FROM courses c
 ),
 period_bookings AS MATERIALIZED (SELECT * FROM live_bookings WHERE starts_at>=starts AND starts_at<=ends),
 sessions AS MATERIALIZED (
   SELECT teacher_id,coalesce(group_id,id) AS session_id,min(starts_at) AS starts_at,max(ends_at) AS ends_at,
    bool_or(status='completed') AS completed,count(*) FILTER(WHERE status='completed') AS attended,
    count(*) FILTER(WHERE status='no_show') AS missed,count(*) FILTER(WHERE status='cancelled') AS cancelled,
    count(*) FILTER(WHERE status='booked' AND ends_at<=ends) AS pending_attendance,
    bool_or(status<>'cancelled') AS has_participants,
    bool_or(nullif(recording,'') IS NOT NULL) OR EXISTS(SELECT 1 FROM live_assets a WHERE a.teacher_id=b.teacher_id
      AND (a.group_id=b.group_id OR a.booking_id=b.id) AND a.kind='recording' AND a.state IN ('ready','processing')) AS has_recording
   FROM period_bookings b GROUP BY teacher_id,coalesce(group_id,id),group_id,id
 ),
 -- Collapse participant rows again so a shared group counts as one taught session.
 unique_sessions AS MATERIALIZED (
   SELECT teacher_id,session_id,min(starts_at) AS starts_at,max(ends_at) AS ends_at,bool_or(completed) AS completed,
    sum(attended) AS attended,sum(missed) AS missed,sum(cancelled) AS cancelled,sum(pending_attendance) AS pending_attendance,
    bool_or(has_participants) AS has_participants,bool_or(has_recording) AS has_recording
   FROM sessions GROUP BY teacher_id,session_id
 ),
 teachers AS (
   SELECT t.id,t.profile->>'name' AS name,t.profile->>'status' AS status,
    (SELECT count(*) FROM unique_sessions s WHERE s.teacher_id=t.id AND s.has_participants) AS sessions,
    (SELECT count(*) FROM unique_sessions s WHERE s.teacher_id=t.id AND s.completed) AS completed_sessions,
    (SELECT count(*) FROM period_bookings b WHERE b.teacher_id=t.id AND b.status='completed') AS attended,
    (SELECT count(*) FROM period_bookings b WHERE b.teacher_id=t.id AND b.status='no_show') AS missed,
    (SELECT count(*) FROM period_bookings b WHERE b.teacher_id=t.id AND b.status='cancelled') AS cancelled,
    (SELECT count(*) FROM unique_sessions s WHERE s.teacher_id=t.id AND s.ends_at<=ends AND s.has_participants AND (s.completed OR s.pending_attendance>0) AND NOT s.has_recording) AS missing_recordings
   FROM live_teachers t
 ),
 activity AS (
   SELECT 'signup:'||s.id AS id,s.id AS user_id,s.name AS name,'Account created'::text AS description,s.created_at AS occurred_at FROM cohort s
   UNION ALL SELECT 'purchase:'||p.id,p.user_id,u.name,'Order: '||coalesce(c.title,'Deleted product'),p.purchased_at FROM paid p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN courses c ON c.id=p.course_id
   UNION ALL SELECT 'booking:'||b.id,b.user_id,u.name,'Lesson booked: '||b.title,b.created_at FROM live_bookings b JOIN users u ON u.id=b.user_id WHERE b.created_at>=starts AND b.created_at<=ends
   UNION ALL SELECT 'attendance:'||b.id,b.user_id,u.name,'Attendance confirmed: '||b.title,b.updated_at FROM live_bookings b JOIN users u ON u.id=b.user_id WHERE b.status='completed' AND b.updated_at>=starts AND b.updated_at<=ends
 )
 SELECT jsonb_build_object(
 'generatedAt',ends,'from',starts,'to',ends,'timezone',p_timezone,'days',p_days,'currency',p_currency,
 'currencies',(SELECT coalesce(jsonb_agg(currency ORDER BY currency),'[]') FROM (SELECT DISTINCT upper(currency) currency FROM purchases WHERE currency~'^[A-Za-z]{3}$' UNION SELECT p_currency) x),
 'summary',jsonb_build_object(
   'studentAccounts',(SELECT count(*) FROM students),'enabledAccounts',(SELECT count(*) FROM students WHERE status='active'),
   'newRegistrations',(SELECT count(*) FROM cohort),'previousRegistrations',(SELECT count(*) FROM students WHERE created_at>=prior AND created_at<starts),
   'activeLearners',(SELECT count(DISTINCT user_id) FROM (SELECT user_id FROM events WHERE occurred_at>=starts UNION SELECT id FROM students WHERE last_sign_in_at>=starts AND last_sign_in_at<=ends) a),
   'paidOrders',(SELECT count(*) FROM paid),'netRevenue',(SELECT coalesce(sum(net),0) FROM paid),
   'previousRevenue',(SELECT coalesce(sum(net),0) FROM payments WHERE purchased_at>=prior AND purchased_at<starts),
   'grossRevenue',(SELECT coalesce(sum(amount),0) FROM paid),'refundsOnOrders',(SELECT coalesce(sum(coalesce(refunded_amount,0)),0) FROM paid),
   'activeEnrollments',(SELECT count(*) FROM enrollments e JOIN students s ON s.id=e.user_id WHERE e.status='active'),
   'learningItemsCompleted',(SELECT count(*) FROM events WHERE kind='learning_item' AND occurred_at>=starts),
   'quizAttempts',(SELECT count(*) FROM events WHERE kind='quiz' AND occurred_at>=starts)
 ),
 'funnel',jsonb_build_object('registered',(SELECT count(*) FROM cohort),'confirmed',(SELECT count(*) FROM cohort WHERE email_confirmed_at IS NOT NULL),
   'signedIn',(SELECT count(*) FROM cohort WHERE last_sign_in_at IS NOT NULL),
   'enrolled',(SELECT count(*) FROM cohort s WHERE EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=s.id AND e.status='active')),
   'paying',(SELECT count(*) FROM cohort s WHERE EXISTS(SELECT 1 FROM purchases p WHERE p.user_id=s.id AND p.status IN ('completed','refunded') AND p.amount>coalesce(p.refunded_amount,0) AND p.purchased_at<=ends))
 ),
 'trends',(SELECT jsonb_agg(to_jsonb(d) ORDER BY day) FROM daily d),
 'courses',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY active_enrollments DESC,title),'[]') FROM course_metrics c),
 'paymentsByMethod',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY revenue DESC),'[]') FROM (SELECT coalesce(payment_method,'Unknown') AS method,count(*) AS orders,sum(net) AS revenue FROM paid GROUP BY 1) x),
 'orderStatuses',(SELECT coalesce(jsonb_object_agg(status,n),'{}') FROM (SELECT status,count(*) n FROM purchases WHERE upper(currency)=p_currency AND purchased_at>=starts AND purchased_at<=ends GROUP BY status) x),
 'live',jsonb_build_object('bookings',(SELECT count(*) FROM period_bookings),'completedSessions',(SELECT count(*) FROM unique_sessions WHERE completed),
   'attendances',(SELECT count(*) FROM period_bookings WHERE status='completed'),'noShows',(SELECT count(*) FROM period_bookings WHERE status='no_show'),
   'cancelled',(SELECT count(*) FROM period_bookings WHERE status='cancelled'),'awaitingAttendance',(SELECT count(*) FROM period_bookings WHERE status='booked' AND ends_at<=ends),
   'upcoming',(SELECT count(*) FROM live_bookings WHERE status='booked' AND ends_at>ends),
   'missingRecordings',(SELECT count(*) FROM unique_sessions WHERE ends_at<=ends AND has_participants AND (completed OR pending_attendance>0) AND NOT has_recording),
   'teachers',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY completed_sessions DESC,name),'[]') FROM teachers t)),
 'health',jsonb_build_object(
   'paymentOrphans',(SELECT count(*) FROM payment_orphans WHERE NOT resolved),
   'accountsWithoutProfile',(SELECT count(*) FROM auth.users a WHERE NOT EXISTS(SELECT 1 FROM users u WHERE u.id=a.id)),
   'profilesWithoutAccount',(SELECT count(*) FROM users u WHERE NOT EXISTS(SELECT 1 FROM auth.users a WHERE a.id=u.id)),
   'paidWithoutAccess',(SELECT count(*) FROM purchases p WHERE p.status='completed' AND p.amount>coalesce(p.refunded_amount,0) AND NOT EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=p.user_id AND e.course_id=p.course_id AND e.status='active')),
   'activeTeachersWithoutLogin',(SELECT count(*) FROM live_teachers WHERE profile->>'status'='active' AND user_id IS NULL),
   'activeTeachersWithoutHours',(SELECT count(*) FROM live_teachers WHERE profile->>'status'='active' AND jsonb_array_length(profile->'weekly')=0 AND jsonb_array_length(profile->'groups')=0),
   'failedAssets',(SELECT count(*) FROM live_assets WHERE state='error'),
   'staleUploads',(SELECT count(*) FROM live_assets WHERE state IN ('uploading','processing') AND created_at<ends-interval '24 hours'),
   'livePackagesWithoutTeachers',(SELECT count(*) FROM courses c WHERE live_course_program(c.id) IS NOT NULL AND c.is_published AND NOT EXISTS(SELECT 1 FROM live_teachers t WHERE t.profile->>'status'='active' AND t.profile->'programs' ? live_course_program(c.id)))
 ),
 'recentActivity',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY occurred_at DESC),'[]') FROM (SELECT * FROM activity ORDER BY occurred_at DESC LIMIT 20) a)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_analytics_snapshot(integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_snapshot(integer,text,text) TO authenticated;

CREATE FUNCTION public.admin_analytics_people(p_days integer DEFAULT 30,p_search text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='10s' AS $$
DECLARE result jsonb; starts timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_active_administrator() THEN RAISE EXCEPTION 'Active administrator access required.' USING ERRCODE='42501'; END IF;
 IF p_days NOT IN (7,30,90) OR p_days IS NULL OR p_page<1 OR p_page>100000 OR p_page IS NULL OR length(coalesce(p_search,''))>100 THEN RAISE EXCEPTION 'Invalid people filter.'; END IF;
 starts:=((now() AT TIME ZONE 'Europe/Belgrade')::date-(p_days-1))::timestamp AT TIME ZONE 'Europe/Belgrade';
 WITH matched AS MATERIALIZED (
 SELECT s.* FROM admin_analytics_students s WHERE s.created_at>=starts AND s.created_at<=now()
 AND (coalesce(p_search,'')='' OR position(lower(p_search) in lower(coalesce(s.name,'')||' '||s.email))>0)
 ),page AS (
 SELECT s.*,(SELECT count(*) FROM enrollments e WHERE e.user_id=s.id AND e.status='active') AS active_packages,
 (SELECT count(*) FROM live_bookings b WHERE b.user_id=s.id AND b.status='completed') AS live_attended,
 (SELECT max(occurred_at) FROM admin_analytics_activity a WHERE a.user_id=s.id) AS last_learning_activity
 FROM matched s ORDER BY created_at DESC,id LIMIT 25 OFFSET (p_page-1)*25
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'page',p_page,'pageSize',25,'rows',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id),'[]') FROM page p)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_analytics_people(integer,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_people(integer,text,integer) TO authenticated;
COMMIT;
