BEGIN;
TRUNCATE public.live_vimeo_uploads,public.live_assets,public.live_bookings,public.live_teacher_selections,public.live_teachers,public.enrollments,public.purchases,public.courses,public.users,auth.users CASCADE;
INSERT INTO auth.users(id,email,created_at,email_confirmed_at,last_sign_in_at)
SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'person'||n||'@example.invalid',now()-interval '1 day',CASE WHEN n<>4 THEN now() END,CASE WHEN n<>4 THEN now() END FROM generate_series(1,5)n;
INSERT INTO users(id,email,name,role,status) SELECT id,email,'Person '||email,CASE WHEN email='person1@example.invalid' THEN 'admin' WHEN email='person5@example.invalid' THEN 'editor' ELSE 'student' END,'active' FROM auth.users;
INSERT INTO courses(id,title,level,product_type,content_format,modules) VALUES
 ('10000000-0000-4000-8000-000000000001','Hybrid','hybrid-pack','service','hybrid','[]'),
 ('10000000-0000-4000-8000-000000000002','Interactive','A1','learndash','interactive','[{"lessons":[{"id":"lesson-1"},{"id":"lesson-2"}],"homework":[]}]');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT save_live_teacher('{"id":"20000000-0000-4000-8000-000000000001","name":"Teacher","email":"person2@example.invalid","bio":"Teacher","photo":"","video":"","languages":"English","timezone":"Europe/Belgrade","status":"active","programs":["hybrid-pack"],"daysOff":[],"weekly":[],"groups":[]}');
INSERT INTO enrollments(id,user_id,course_id,status) VALUES
 ('40000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','active'),
 ('40000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','active'),
 ('40000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','active');
INSERT INTO purchases(user_id,course_id,status,amount,refunded_amount,currency,purchased_at) VALUES
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','completed',100,20,'EUR',now()),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','refunded',50,50,'EUR',now()),
 ('00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','pending',800,0,'EUR',now()),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','completed',11700,0,'RSD',now()),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','completed',200,0,'EUR',now()-interval '10 days');
INSERT INTO progress(user_id,course_id,lesson_id,is_completed,completed_at) VALUES
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','lesson-1',true,now()),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','obsolete-item',true,now());
INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,group_id,starts_at,ends_at,timezone,title,status,credit_used)
SELECT id,user_id,course_id,'20000000-0000-4000-8000-000000000001','hybrid-pack','group','30000000-0000-4000-8000-000000000001',now()-interval '2 hours',now()-interval '1 hour','Europe/Belgrade','Group','completed',true FROM enrollments WHERE course_id='10000000-0000-4000-8000-000000000001';
INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,starts_at,ends_at,timezone,title,status,credit_used)
SELECT id,user_id,course_id,'20000000-0000-4000-8000-000000000001','hybrid-pack','private',now()-interval '2 days',now()-interval '2 days'+interval '30 minutes','Europe/Belgrade','Missed private lesson','no_show',true FROM enrollments WHERE id='40000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
SELECT test_assert(NOT has_table_privilege(current_user,'admin_analytics_students','SELECT'),'private account reporting view');
SELECT test_assert(NOT has_table_privilege(current_user,'admin_analytics_activity','SELECT'),'private event reporting view');
CREATE TEMP TABLE report AS SELECT admin_analytics_snapshot(7,'EUR') AS d;
SELECT test_assert((d#>>'{summary,newRegistrations}')::int=2,'registration count excludes admin, editor and linked teacher') FROM report;
SELECT test_assert((d#>>'{summary,netRevenue}')::numeric=80,'net revenue excludes pending orders, old orders and other currencies') FROM report;
SELECT test_assert((d#>>'{summary,previousRevenue}')::numeric=200,'previous period correctly bounded') FROM report;
SELECT test_assert((d#>>'{summary,paidOrders}')::int=2,'completed and refunded order cohort') FROM report;
SELECT test_assert(jsonb_array_length(d->'trends')=7,'daily series includes zero days') FROM report;
SELECT test_assert((d#>>'{live,completedSessions}')::int=1 AND (d#>>'{live,attendances}')::int=2,'group session counted once with two attendances') FROM report;
SELECT test_assert((d#>>'{live,missingRecordings}')::int=1,'one missing video per group session, no video required for missed private lesson') FROM report;
SELECT test_assert((SELECT (c->>'average_progress')::numeric FROM jsonb_array_elements(d->'courses') c WHERE c->>'level'='A1')=50,'progress ignores removed lesson IDs') FROM report;
SELECT test_assert((d#>>'{funnel,paying}')::int=1,'cohort conversion counts people rather than orders') FROM report;
SELECT test_assert((admin_analytics_snapshot(7,'RSD')#>>'{summary,netRevenue}')::numeric=11700,'RSD reporting has no EUR inflation');
SELECT test_assert((admin_analytics_people(7,'person3',1)->>'total')::int=1,'search returns exact registration matches');
SELECT test_assert((admin_analytics_people(7,'%',1)->>'total')::int=0,'wildcard characters are literal searches');
SELECT test_assert((admin_user_metrics('00000000-0000-4000-8000-000000000003')->'spentByCurrency'->0->>'amount')::numeric=280,'student details net out refunds and pending orders');
SELECT test_assert(jsonb_array_length(admin_user_metrics('00000000-0000-4000-8000-000000000003')->'spentByCurrency')=2,'student details keep currencies separate');
SELECT test_assert((SELECT (p->>'percentage')::numeric FROM jsonb_array_elements(admin_user_metrics('00000000-0000-4000-8000-000000000003')->'progress') p WHERE p->>'kind'='interactive')=50,'student detail has actual progress rather than enrollment status');
SELECT test_reject($$SELECT admin_analytics_snapshot(365,'EUR')$$,'Choose 7');
SELECT test_reject($$SELECT admin_analytics_snapshot(NULL,'EUR')$$,'Choose 7');
SELECT test_reject($$SELECT admin_analytics_people(7,'',0)$$,'Invalid people');
SELECT test_reject($$SELECT admin_analytics_snapshot(7,'EUR','Invalid/Zone')$$,'timezone');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_reject($$SELECT admin_analytics_snapshot()$$,'administrator');
SELECT test_reject($$SELECT admin_analytics_people()$$,'administrator');
SELECT test_reject($$SELECT admin_user_metrics('00000000-0000-4000-8000-000000000004')$$,'staff');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
SELECT test_reject($$SELECT admin_analytics_snapshot()$$,'administrator');
RESET ROLE;
UPDATE users SET status='paused' WHERE id='00000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SET ROLE authenticated;
SELECT test_reject($$SELECT admin_analytics_snapshot()$$,'administrator');
RESET ROLE;
SET ROLE anon;
SELECT test_reject($$SELECT admin_analytics_snapshot()$$,'permission denied');
RESET ROLE;
ROLLBACK;
SELECT 'PASS: analytics permissions, real registration cohorts, date ranges, refunds/currencies, course progress and group-session deduplication';
