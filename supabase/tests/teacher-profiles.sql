-- Disposable fixture only. Never run these synthetic accounts against production.
BEGIN;
UPDATE users SET status='active' WHERE id='00000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT test_assert((SELECT count(*)=3 FROM live_teachers WHERE id IN ('7f728974-cd84-4dd3-9643-f5f532df2b01','7f728974-cd84-4dd3-9643-f5f532df2b02','7f728974-cd84-4dd3-9643-f5f532df2b03') AND email IS NULL AND user_id IS NULL AND profile->>'email'='' AND profile->>'status'='active' AND profile->>'timezone'='Europe/Rome' AND jsonb_array_length(profile->'programs')=4),'three active email-free teachers with Italian time zone and all programs');
SELECT test_assert(NOT EXISTS(SELECT 1 FROM live_teachers WHERE id='47bd75fc-a2fe-4c75-b33f-229506a414bd'),'legacy demo removed');
SELECT test_assert(NOT EXISTS(SELECT 1 FROM live_bookings WHERE teacher_id='47bd75fc-a2fe-4c75-b33f-229506a414bd'),'demo test reservations removed');
SELECT test_assert(EXISTS(SELECT 1 FROM enrollments WHERE id='80000000-0000-4000-8000-000000000001'),'demo cleanup preserves enrollment and account');

INSERT INTO auth.users
SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'teacher-matrix-'||n||'@example.invalid' FROM generate_series(21,24)n;
INSERT INTO users SELECT id,email,'Schedule matrix','student','active' FROM auth.users WHERE email LIKE 'teacher-matrix-%';
INSERT INTO courses(id,title,level,product_type,content_format)
SELECT ('10000000-0000-4000-8000-'||lpad((100+row_number() OVER(ORDER BY program))::text,12,'0'))::uuid,program,program,'service','live' FROM live_program_settings;
INSERT INTO enrollments(id,user_id,course_id,status)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000000024',id,'active' FROM courses WHERE id::text LIKE '10000000-0000-4000-8000-00000000010%';

CREATE TEMP TABLE schedule_expected(name text,day int,times jsonb,PRIMARY KEY(name,day));
INSERT INTO schedule_expected
SELECT 'Ana',n,'["16:00","16:30","17:00","17:30","18:00","18:30"]'::jsonb FROM generate_series(0,4)n;
INSERT INTO schedule_expected VALUES
 ('Erika',0,'["17:30","18:00","18:30"]'),
 ('Erika',2,'["17:30","18:00"]'),
 ('Erika',3,'["15:00","15:30","16:00","16:30","17:00","17:30","18:00"]'),
 ('Erika',4,'["14:30","15:00","15:30","16:00","16:30","17:00","17:30"]'),
 ('Juliana',1,'["15:00","15:30","16:00","16:30","17:00","17:30"]'),
 ('Juliana',2,'["15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"]'),
 ('Juliana',4,'["15:00","15:30","16:00","16:30","17:00","17:30","19:00","19:30"]');
UPDATE live_program_settings SET buffer_minutes=0;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000024',false);
SELECT test_assert((SELECT count(*)=3 FROM jsonb_array_elements(live_workspace()->'teachers') t WHERE t->>'id' LIKE '7f728974-cd84-4dd3-9643-f5f532df2b0%'),'enrolled student sees all three teachers without logins');
SELECT test_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(live_workspace()->'teachers') t WHERE t ? 'availabilityNotes'),'internal schedule notes are hidden from student directory');
DO $$DECLARE t live_teachers; c courses; d int; season int; monday date; expected jsonb; available jsonb; checked int:=0; BEGIN
 FOR t IN SELECT * FROM live_teachers WHERE id::text LIKE '7f728974-cd84-4dd3-9643-f5f532df2b0%' LOOP
  FOR c IN SELECT * FROM courses WHERE id::text LIKE '10000000-0000-4000-8000-00000000010%' LOOP
   PERFORM select_live_teacher(c.id,t.id);
   FOR season IN 0..1 LOOP
    monday:=current_date+14+90*season;
    monday:=monday+(8-extract(isodow FROM monday)::int)%7;
    FOR d IN 0..6 LOOP
     expected:='[]'::jsonb;
     IF c.level IN ('starter-path','hybrid-pack') THEN
      SELECT coalesce((SELECT times FROM schedule_expected WHERE name=t.profile->>'name' AND day=d),'[]') INTO expected;
     END IF;
     available:=live_availability(c.id,t.id,monday+d);
     PERFORM test_assert(available->'times'=expected,format('%s / %s / day %s / season %s: expected %s, got %s',t.profile->>'name',c.level,d,season,expected,available->'times'));
     PERFORM test_assert(available->'groups'='[]'::jsonb,'weekly windows do not invent dated group sessions');
     checked:=checked+1;
    END LOOP;
   END LOOP;
  END LOOP;
 END LOOP;
 PERFORM test_assert(checked=168,'all teacher/program/day/season combinations were checked');
END $$;
SELECT test_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(live_workspace()->'teachers') t WHERE t->>'email'<>''),'student roster hides teacher email addresses');
SELECT test_reject($q$SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',revision) FROM live_teachers WHERE id='7f728974-cd84-4dd3-9643-f5f532df2b02'))$q$,'Only administrators');
DO $$DECLARE c uuid; e uuid; monday date:=current_date+14; request_id uuid; staff_request uuid; BEGIN
 monday:=monday+(8-extract(isodow FROM monday)::int)%7;
 SELECT id INTO c FROM courses WHERE title='hybrid-pack';
 SELECT id INTO e FROM enrollments WHERE course_id=c AND user_id=auth.uid();
 PERFORM select_live_teacher(c,'7f728974-cd84-4dd3-9643-f5f532df2b01');
 request_id:=book_live_lesson(c,'7f728974-cd84-4dd3-9643-f5f532df2b01',monday,'16:00');
 PERFORM test_assert((SELECT status='pending' AND credit_used FROM live_bookings WHERE id=request_id),'student can request an unlinked teacher and reserve a credit');
 PERFORM test_assert((SELECT count(*)=2 AND bool_and(audience IN ('student','admin')) FROM live_booking_notifications WHERE booking_id=request_id),'requests still notify student and admin without queuing an impossible teacher email');
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
 PERFORM update_live_booking(request_id,'approve');
 PERFORM test_assert((SELECT status='booked' FROM live_bookings WHERE id=request_id),'staff can approve an unlinked teacher');
 UPDATE live_bookings SET starts_at=now()+interval '6 hours',ends_at=now()+interval '6 hours 30 minutes' WHERE id=request_id;
 PERFORM prepare_live_booking_notifications();
 PERFORM test_assert((SELECT count(*)=1 AND bool_and(audience='student') FROM live_booking_notifications WHERE booking_id=request_id AND event='reminder'),'reminders still reach student without missing-recipient teacher jobs');
 PERFORM update_live_booking(request_id,'cancel');
 PERFORM test_assert((SELECT NOT credit_used FROM live_bookings WHERE id=request_id),'staff cancellation refunds the credit');
 staff_request:=staff_live_booking(e,'7f728974-cd84-4dd3-9643-f5f532df2b03',monday+4,'15:00',NULL,NULL,'Staff-managed teacher test');
 PERFORM test_assert((SELECT status='pending' FROM live_bookings WHERE id=staff_request),'staff can create a booking with an unlinked teacher');
 PERFORM update_live_booking(staff_request,'cancel');
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000024',false);
 PERFORM select_live_teacher(c,'7f728974-cd84-4dd3-9643-f5f532df2b03');
 PERFORM test_reject(format('SELECT book_live_lesson(%L,%L,%L,''18:00'')',c,'7f728974-cd84-4dd3-9643-f5f532df2b03',monday+4),'no longer available');
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$DECLARE t live_teachers; n int:=21; BEGIN
 FOR t IN SELECT * FROM live_teachers WHERE id::text LIKE '7f728974-cd84-4dd3-9643-f5f532df2b0%' ORDER BY id LOOP
  PERFORM save_live_teacher(t.profile||jsonb_build_object('revision',t.revision,'email','teacher-matrix-'||n||'@example.invalid'));
  PERFORM test_assert((SELECT user_id=('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM live_teachers WHERE id=t.id),'email added later links the matching login');
  n:=n+1;
 END LOOP;
END $$;
UPDATE users SET status='blocked' WHERE id='00000000-0000-4000-8000-000000000021';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000024',false);
SELECT test_reject($q$SELECT select_live_teacher((SELECT id FROM courses WHERE title='starter-path'),'7f728974-cd84-4dd3-9643-f5f532df2b01')$q$,'unavailable');
SELECT test_reject($q$SELECT live_availability((SELECT id FROM courses WHERE title='starter-path'),'7f728974-cd84-4dd3-9643-f5f532df2b01',current_date+20)$q$,'Teacher unavailable');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
UPDATE live_teachers SET profile=jsonb_set(profile,'{status}','"inactive"') WHERE id='7f728974-cd84-4dd3-9643-f5f532df2b01';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000024',false);
SELECT test_reject($q$SELECT live_availability((SELECT id FROM courses WHERE title='starter-path'),'7f728974-cd84-4dd3-9643-f5f532df2b01',current_date+20)$q$,'Teacher unavailable');
ROLLBACK;
