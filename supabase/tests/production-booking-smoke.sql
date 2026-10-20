-- Integration smoke test using existing active enrollments. EVERY change rolls back.
-- No retained bookings, credits, selections, audit entries or email queue events.
BEGIN;
CREATE TEMP TABLE booking_smoke_result(program text,teacher text,group_flow boolean,private_available boolean);
DO $$
DECLARE
 enrollment record;
 teacher live_teachers;
 administrator uuid;
 available jsonb;
 original_group jsonb;
 next_group jsonb;
 request_id uuid;
 replacement_id uuid;
 first_day date;
 has_private boolean;
BEGIN
 SELECT id INTO administrator FROM users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1;
 IF administrator IS NULL THEN RAISE EXCEPTION 'An active booking administrator is required.'; END IF;
 FOR enrollment IN SELECT DISTINCT ON (live_course_program(e.course_id)) e.*,live_course_program(e.course_id) AS program
  FROM enrollments e JOIN users u ON u.id=e.user_id
  WHERE e.status='active' AND u.status='active' AND live_course_program(e.course_id) IN ('hybrid-pack','language-lab-pro')
  ORDER BY live_course_program(e.course_id),e.id
 LOOP
  FOR teacher IN SELECT * FROM live_teachers WHERE id::text LIKE '7f728974-cd84-4dd3-9643-f5f532df2b0%' ORDER BY id LOOP
   PERFORM set_config('request.jwt.claim.sub',enrollment.user_id::text,true);
   PERFORM select_live_teacher(enrollment.course_id,teacher.id);
   first_day:=(now() AT TIME ZONE (teacher.profile->>'timezone'))::date;
   available:=live_availability(enrollment.course_id,teacher.id,first_day);
   IF jsonb_array_length(available->'groups')=0 THEN RAISE EXCEPTION 'No groups returned for % / %',teacher.profile->>'name',enrollment.program; END IF;
   SELECT g INTO original_group FROM jsonb_array_elements(available->'groups') g
    WHERE (g->>'date')::date>=first_day+8 ORDER BY g->>'date',g->>'start' LIMIT 1;
   SELECT g INTO next_group FROM jsonb_array_elements(available->'groups') g
    WHERE (g->>'date')::date>=first_day+8 AND g->>'id'<>original_group->>'id' ORDER BY g->>'date',g->>'start' LIMIT 1;
   IF original_group IS NULL OR next_group IS NULL THEN RAISE EXCEPTION 'Two future group sessions are required.'; END IF;
   request_id:=book_live_lesson(enrollment.course_id,teacher.id,(original_group->>'date')::date,NULL,(original_group->>'id')::uuid);
   IF NOT EXISTS(SELECT 1 FROM live_bookings WHERE id=request_id AND status='pending' AND credit_used) THEN RAISE EXCEPTION 'Reservation did not reserve a credit pending approval.'; END IF;
   PERFORM set_config('request.jwt.claim.sub',administrator::text,true);
   PERFORM update_live_booking(request_id,'approve');
   IF NOT EXISTS(SELECT 1 FROM live_bookings WHERE id=request_id AND status='booked') THEN RAISE EXCEPTION 'Staff approval failed.'; END IF;
   PERFORM set_config('request.jwt.claim.sub',enrollment.user_id::text,true);
   replacement_id:=reschedule_live_lesson(request_id,(next_group->>'date')::date,NULL,(next_group->>'id')::uuid);
   IF NOT EXISTS(SELECT 1 FROM live_bookings WHERE id=request_id AND status='cancelled' AND NOT credit_used) THEN RAISE EXCEPTION 'Rescheduling did not return the eligible old credit.'; END IF;
   IF NOT EXISTS(SELECT 1 FROM live_bookings WHERE id=replacement_id AND status='pending' AND credit_used) THEN RAISE EXCEPTION 'Rescheduling did not create a pending replacement.'; END IF;
   PERFORM update_live_booking(replacement_id,'cancel');
   IF NOT EXISTS(SELECT 1 FROM live_bookings WHERE id=replacement_id AND status='cancelled' AND NOT credit_used) THEN RAISE EXCEPTION 'Eligible cancellation did not return the credit.'; END IF;
   has_private:=false;
   IF enrollment.program='hybrid-pack' THEN
    FOR offset_day IN 3..16 LOOP
     available:=live_availability(enrollment.course_id,teacher.id,first_day+offset_day);
     has_private:=has_private OR jsonb_array_length(available->'times')>0;
    END LOOP;
    IF NOT has_private THEN RAISE EXCEPTION 'Private availability disappeared for %',teacher.profile->>'name'; END IF;
   END IF;
   INSERT INTO booking_smoke_result VALUES(enrollment.program,teacher.profile->>'name',true,has_private);
  END LOOP;
 END LOOP;
 IF (SELECT count(*) FROM booking_smoke_result)<>6 THEN RAISE EXCEPTION 'Expected all six teacher/package combinations.'; END IF;
END $$;
SELECT * FROM booking_smoke_result ORDER BY program,teacher;
ROLLBACK;
