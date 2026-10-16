-- Disposable database fixture for the exact legacy demo targeted by cleanup.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
UPDATE users SET status='active' WHERE id=auth.uid();
INSERT INTO live_teachers(id,email,profile)
SELECT '47bd75fc-a2fe-4c75-b33f-229506a414bd','demo-cleanup@example.invalid',profile||jsonb_build_object('id','47bd75fc-a2fe-4c75-b33f-229506a414bd','name','Ana — DEMO','email','demo-cleanup@example.invalid','groups','[]'::jsonb)
FROM live_teachers WHERE id='20000000-0000-4000-8000-000000000001';
INSERT INTO enrollments(id,user_id,course_id,status)
VALUES('80000000-0000-4000-8000-000000000001',auth.uid(),'10000000-0000-4000-8000-000000000001','active');
INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,starts_at,ends_at,timezone,title,status,credit_used)
SELECT '80000000-0000-4000-8000-000000000001',auth.uid(),'10000000-0000-4000-8000-000000000001','47bd75fc-a2fe-4c75-b33f-229506a414bd','hybrid-pack','private',now()-make_interval(days=>n),now()-make_interval(days=>n)+interval '30 minutes','Europe/Rome','Demo cleanup',CASE WHEN n=2 THEN 'cancelled' ELSE 'booked' END,n<>2 FROM generate_series(1,2)n;
INSERT INTO live_teacher_selections(user_id,course_id,teacher_id) VALUES(auth.uid(),'10000000-0000-4000-8000-000000000001','47bd75fc-a2fe-4c75-b33f-229506a414bd');
INSERT INTO live_group_sessions(id,teacher_id,starts_at,session)
VALUES(gen_random_uuid(),'47bd75fc-a2fe-4c75-b33f-229506a414bd',now()-interval '2 days','{}');
