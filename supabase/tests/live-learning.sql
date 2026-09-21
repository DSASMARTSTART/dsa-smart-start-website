\set ON_ERROR_STOP on
CREATE FUNCTION public.test_assert(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF NOT coalesce(ok,false) THEN RAISE EXCEPTION 'FAIL: %',message; END IF; END$$;
CREATE FUNCTION public.test_reject(command text,expected text) RETURNS void LANGUAGE plpgsql AS $$BEGIN EXECUTE command; RAISE EXCEPTION 'FAIL: accepted forbidden operation: %',command; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT ILIKE '%'||expected||'%' THEN RAISE; END IF; END$$;
INSERT INTO auth.users SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'person'||n||'@example.invalid' FROM generate_series(1,8) n;
INSERT INTO users SELECT id,email,'Person '||email,CASE WHEN email='person1@example.invalid' THEN 'admin' ELSE 'student' END,'active' FROM auth.users;
INSERT INTO courses(id,title,level,product_type,content_format,teaching_materials_included) VALUES('10000000-0000-4000-8000-000000000001','Hybrid Pack','hybrid-pack','service','hybrid',true);
INSERT INTO courses(id,title,level,product_type,content_format) VALUES('10000000-0000-4000-8000-000000000002','Interactive A1','A1','learndash','interactive');
INSERT INTO enrollments SELECT gen_random_uuid(),id,'10000000-0000-4000-8000-000000000001','active' FROM users WHERE email NOT IN ('person1@example.invalid','person8@example.invalid');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT save_live_teacher(jsonb_build_object('id','20000000-0000-4000-8000-000000000001','name','Teacher Test','email','person2@example.invalid','bio','Test teacher','photo','','video','','languages','English','timezone','Europe/Belgrade','status','active','programs',jsonb_build_array('hybrid-pack'),'daysOff','[]'::jsonb,'weekly',(SELECT jsonb_agg(jsonb_build_object('id',n,'day',n,'start','10:00','end','20:00')) FROM generate_series(0,6)n),'groups',jsonb_build_array(jsonb_build_object('id','30000000-0000-4000-8000-000000000001','date',(current_date+2)::text,'start','12:00','program','hybrid-pack','capacity',3,'title','Group test','zoom','https://zoom.us/test','recording',''))));
SELECT test_assert((live_workspace()->'teachers'->0->>'email')='person2@example.invalid','admin sees teacher contact');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000008',false);
SELECT test_reject($$SELECT select_live_teacher('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')$$,'active live package');
SELECT test_assert(jsonb_array_length(live_workspace()->'teachers')=0,'unenrolled users cannot list teachers');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_assert((live_workspace()->'teachers'->0->>'email')='','student directory hides email');
SELECT test_assert(NOT ((live_workspace()->'teachers'->0->'groups'->0) ? 'zoom'),'student directory hides meeting URL');
SELECT select_live_teacher('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
SELECT test_assert(live_availability('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+1)->'times' ? '10:00','future weekly availability');
SELECT book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+1,'10:00');
SELECT test_reject($$SELECT book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+1,'10:00')$$,'no longer available');
SELECT test_assert(jsonb_array_length(live_workspace()->'bookings')=1,'student can read own reservation');
SELECT test_reject(format('SELECT update_live_booking(%L,''cancel'')',(SELECT id FROM live_bookings LIMIT 1)),'contact your teacher');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
SELECT select_live_teacher('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
SELECT test_assert(NOT(live_availability('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+1)->'times' ? '10:00'),'other student cannot see occupied slot');
SELECT test_assert(jsonb_array_length(live_workspace()->'bookings')=0,'student cannot read other bookings');
SELECT test_reject(format('SELECT update_live_booking(%L,''media'',''https://evil.invalid'','''')',(SELECT id FROM live_bookings LIMIT 1)),'private');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT test_assert(live_workspace()->>'ownTeacherId'='20000000-0000-4000-8000-000000000001','teacher linked to their own login');
SELECT update_live_booking((SELECT id FROM live_bookings LIMIT 1),'cancel');
SELECT test_assert((SELECT NOT credit_used FROM live_bookings LIMIT 1),'teacher cancellation restores credit');
SELECT test_reject($$SELECT save_live_settings('hybrid-pack','{}')$$,'Administrator');
-- Fill the 3-seat group using three different students.
DO $$DECLARE n integer; BEGIN FOR n IN 3..5 LOOP
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-'||lpad(n::text,12,'0'),false);
 PERFORM select_live_teacher('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
 PERFORM book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+2,NULL,'30000000-0000-4000-8000-000000000001');
END LOOP; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
SELECT select_live_teacher('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
SELECT test_reject($$SELECT book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+2,NULL,'30000000-0000-4000-8000-000000000001')$$,'full or unavailable');
-- Private and group balances are separate. Five private reservations exhaust only private credits.
DO $$DECLARE n integer; BEGIN FOR n IN 1..5 LOOP
 PERFORM book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+3+n,'11:00');
END LOOP; END $$;
SELECT test_reject($$SELECT book_live_lesson('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',current_date+12,'11:00')$$,'No remaining credits');
-- No direct table access or RPC calls for anonymous visitors.
SET ROLE authenticated;
SELECT test_reject('SELECT * FROM live_teachers','permission denied');
SELECT test_assert(live_workspace() IS NOT NULL,'authenticated RPC access works');
RESET ROLE;
SET ROLE anon;
SELECT test_reject('SELECT live_workspace()','permission denied');
RESET ROLE;
SELECT 'PASS: entitlement, privacy, teacher login, cancellation, group capacity, credits, role grants' AS result;
