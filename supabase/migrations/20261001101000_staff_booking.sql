BEGIN;
CREATE TABLE live_credit_adjustments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),enrollment_id uuid NOT NULL REFERENCES enrollments(id),kind text NOT NULL CHECK(kind IN ('private','group')),amount int NOT NULL CHECK(amount<>0 AND abs(amount)<=1000),reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 500),created_by uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE live_credit_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_credit_adjustments FROM PUBLIC,anon,authenticated;
GRANT ALL ON live_credit_adjustments TO service_role;
CREATE TRIGGER audit_credit AFTER INSERT ON live_credit_adjustments FOR EACH ROW EXECUTE FUNCTION admin_audit_change('credit');
CREATE FUNCTION live_credit_allowance(p_enrollment uuid,p_kind text) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT (CASE WHEN p_kind='private' THEN CASE WHEN live_course_program(e.course_id) IN ('starter-path','hybrid-pack') THEN 5 ELSE 0 END ELSE CASE live_course_program(e.course_id) WHEN 'hybrid-pack' THEN 25 WHEN 'language-lab' THEN 8 WHEN 'language-lab-pro' THEN 30 ELSE 0 END END)+coalesce((SELECT sum(amount)::int FROM live_credit_adjustments WHERE enrollment_id=e.id AND kind=p_kind),0) FROM enrollments e WHERE e.id=p_enrollment;
$$;
REVOKE ALL ON FUNCTION live_credit_allowance(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION adjust_live_credits(p_enrollment uuid,p_kind text,p_amount int,p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e enrollments;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 SELECT * INTO e FROM enrollments WHERE id=p_enrollment AND status='active';
 IF e.id IS NULL OR live_course_program(e.course_id) IS NULL THEN RAISE EXCEPTION 'Choose an active live enrollment.'; END IF;
 IF (p_kind='private' AND live_course_program(e.course_id) IN ('language-lab','language-lab-pro')) OR (p_kind='group' AND live_course_program(e.course_id)='starter-path') THEN RAISE EXCEPTION 'This package does not support that lesson type.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(e.user_id::text,2));
 IF live_credit_allowance(e.id,p_kind)+p_amount<(SELECT count(*) FROM live_bookings WHERE enrollment_id=e.id AND kind=p_kind AND credit_used) THEN RAISE EXCEPTION 'Cannot remove credits already used or reserved.'; END IF;
 INSERT INTO live_credit_adjustments(enrollment_id,kind,amount,reason,created_by) VALUES(e.id,p_kind,p_amount,trim(p_reason),auth.uid());
END $$;
CREATE FUNCTION staff_live_enrollments() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'userId',e.user_id,'courseId',e.course_id,'program',live_course_program(e.course_id),'student',u.name,'course',c.title,'privateCredits',live_credit_allowance(e.id,'private'),'groupCredits',live_credit_allowance(e.id,'group'),'privateUsed',(SELECT count(*) FROM live_bookings WHERE enrollment_id=e.id AND kind='private' AND credit_used),'groupUsed',(SELECT count(*) FROM live_bookings WHERE enrollment_id=e.id AND kind='group' AND credit_used)) ORDER BY u.name,c.title),'[]') FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id WHERE e.status='active' AND u.status='active' AND live_course_program(c.id) IS NOT NULL);
END $$;
CREATE OR REPLACE FUNCTION public.live_availability_for(p_course uuid,p_teacher uuid,p_date date,p_reschedule uuid,p_student uuid) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=p_student; v_program text:=live_course_program(p_course); t live_teachers; s live_program_settings; w jsonb; g jsonb; ts timestamptz; finish time; starttime time; times jsonb:='[]'; groups jsonb:='[]'; seats int; gap integer; original live_bookings;
BEGIN
 PERFORM live_require_user();
 IF actor IS DISTINCT FROM auth.uid() AND NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=actor AND status='active') THEN RAISE EXCEPTION 'Student account is not active.'; END IF;
 IF v_program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 IF p_reschedule IS NOT NULL THEN
  SELECT * INTO original FROM live_bookings WHERE id=p_reschedule;
  IF original.user_id IS DISTINCT FROM actor OR original.course_id<>p_course OR (original.teacher_id<>p_teacher AND NOT live_is_admin()) OR original.status NOT IN ('pending','booked') THEN RAISE EXCEPTION 'This reservation cannot be rescheduled.'; END IF;
  IF NOT live_is_admin() AND NOT EXISTS(SELECT 1 FROM live_program_settings rules WHERE rules.program=original.program AND rules.cancellation_hours IS NOT NULL AND original.starts_at>=now()+make_interval(hours=>rules.cancellation_hours)) THEN RAISE EXCEPTION 'Rescheduling requires at least 48 hours notice.'; END IF;
 END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher AND EXISTS(SELECT 1 FROM users account WHERE account.id=live_teachers.user_id AND account.status='active') AND profile->>'status'='active' AND profile->'programs' ? v_program;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Teacher unavailable.'; END IF;
 SELECT * INTO s FROM live_program_settings WHERE live_program_settings.program=v_program;
 -- A teacher needs the same break regardless of which package books next.
 SELECT coalesce(max(buffer_minutes),0) INTO gap FROM live_program_settings WHERE t.profile->'programs' ? program;
 IF p_date < (now() AT TIME ZONE (t.profile->>'timezone'))::date OR p_date > current_date+180 THEN RETURN jsonb_build_object('times',times,'groups',groups); END IF;
 IF v_program IN ('starter-path','hybrid-pack') AND NOT(t.profile->'daysOff' ? p_date::text) THEN
  FOR w IN SELECT value FROM jsonb_array_elements(t.profile->'weekly') WHERE (value->>'day')::int=extract(isodow FROM p_date)::int-1 LOOP
   starttime:=(w->>'start')::time; finish:=(w->>'end')::time;
   WHILE starttime+interval '30 minutes'<=finish AND starttime+interval '30 minutes'>starttime LOOP
    -- Skip nonexistent spring-forward wall times without losing the whole day's calendar.
    IF ((p_date+starttime) AT TIME ZONE (t.profile->>'timezone')) AT TIME ZONE (t.profile->>'timezone') <> p_date+starttime THEN
      starttime:=starttime+make_interval(mins=>30+gap);
      CONTINUE;
    END IF;
    ts:=live_start(p_date,left(starttime::text,5),t.profile->>'timezone');
    IF ts>=now()+make_interval(mins=>s.notice_minutes) AND NOT EXISTS(SELECT 1 FROM live_course_terms ct JOIN enrollments e ON e.id=ct.enrollment_id WHERE e.user_id=actor AND e.course_id=p_course AND ts+interval '30 minutes'>ct.course_ends_at)
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=p_teacher AND b.status<>'cancelled' AND (p_reschedule IS NULL OR b.id<>p_reschedule) AND tstzrange(b.starts_at-make_interval(mins=>gap),b.ends_at+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.profile->'groups') v WHERE tstzrange(live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')-make_interval(mins=>gap),live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')+interval '50 minutes'+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.user_id=actor AND b.status<>'cancelled' AND (p_reschedule IS NULL OR b.id<>p_reschedule) AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    THEN times:=times || to_jsonb(left(starttime::text,5)); END IF;
    EXIT WHEN starttime+make_interval(mins=>30+gap)<=starttime;
    starttime:=starttime+make_interval(mins=>30+gap);
   END LOOP;
  END LOOP;
 END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(t.profile->'groups') WHERE value->>'program'=v_program LOOP
  ts:=live_start((g->>'date')::date,g->>'start',t.profile->>'timezone');
  SELECT (g->>'capacity')::int-count(*) INTO seats FROM live_bookings WHERE group_id=(g->>'id')::uuid AND status<>'cancelled' AND (p_reschedule IS NULL OR id<>p_reschedule);
  IF ts>=now()+make_interval(mins=>s.notice_minutes) AND NOT EXISTS(SELECT 1 FROM live_course_terms ct JOIN enrollments e ON e.id=ct.enrollment_id WHERE e.user_id=actor AND e.course_id=p_course AND ts+interval '50 minutes'>ct.course_ends_at) AND ts<now()+interval '180 days' AND seats>0 AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.user_id=actor AND b.status<>'cancelled' AND (p_reschedule IS NULL OR b.id<>p_reschedule) AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ts,ts+interval '50 minutes','[)')) THEN groups:=groups || jsonb_build_array((g-'zoom'-'recording')||jsonb_build_object('seats',seats)); END IF;
 END LOOP;
 RETURN jsonb_build_object('times',times,'groups',groups);
END $$;
CREATE OR REPLACE FUNCTION live_availability(p_course uuid,p_teacher uuid,p_date date,p_reschedule uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT live_availability_for(p_course,p_teacher,p_date,p_reschedule,auth.uid()) $$;
CREATE FUNCTION staff_live_availability(p_enrollment uuid,p_teacher uuid,p_date date,p_original uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e enrollments; b live_bookings;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 SELECT * INTO e FROM enrollments WHERE id=p_enrollment AND status='active';
 IF e.id IS NULL THEN RAISE EXCEPTION 'Enrollment unavailable.'; END IF;
 IF p_original IS NOT NULL THEN
  SELECT * INTO b FROM live_bookings WHERE id=p_original AND enrollment_id=e.id AND status IN ('pending','booked');
  IF b.id IS NULL THEN RAISE EXCEPTION 'Reservation unavailable.'; END IF;
 END IF;
 RETURN live_availability_for(e.course_id,p_teacher,p_date,p_original,e.user_id);
END $$;
CREATE OR REPLACE FUNCTION public.book_live_lesson_for(p_course uuid,p_teacher uuid,p_date date,p_time text,p_group uuid,p_student uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=p_student; v_program text:=live_course_program(p_course); e enrollments; t live_teachers; avail jsonb; g jsonb; ts timestamptz; v_kind text; allowance int; bid uuid;
BEGIN
 PERFORM live_require_user();
 IF actor IS DISTINCT FROM auth.uid() AND NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 SELECT * INTO e FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active' FOR UPDATE;
 IF e.id IS NULL OR v_program IS NULL THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher;
 IF NOT live_is_admin() AND NOT EXISTS(SELECT 1 FROM live_teacher_selections WHERE user_id=actor AND course_id=p_course AND teacher_id=p_teacher) THEN RAISE EXCEPTION 'Choose this teacher before booking.'; END IF;
 v_kind:=CASE WHEN p_group IS NULL THEN 'private' ELSE 'group' END;
 allowance:=live_credit_allowance(e.id,v_kind);
 IF (SELECT count(*) FROM live_bookings b WHERE b.enrollment_id=e.id AND b.kind=v_kind AND b.credit_used)>=allowance THEN RAISE EXCEPTION 'No remaining credits for this lesson type.'; END IF;
 avail:=live_availability_for(p_course,p_teacher,p_date,NULL,actor);
 IF p_group IS NULL THEN
  IF p_time IS NULL OR NOT(avail->'times' ? p_time) THEN RAISE EXCEPTION 'This time is no longer available. Choose another time.'; END IF;
  ts:=live_start(p_date,p_time,t.profile->>'timezone');
 ELSE
  SELECT value INTO g FROM jsonb_array_elements(avail->'groups') WHERE value->>'id'=p_group::text;
  IF g IS NULL THEN RAISE EXCEPTION 'This group is full or unavailable.'; END IF;
  ts:=live_start((g->>'date')::date,g->>'start',t.profile->>'timezone');
 END IF;
 -- The teacher and student advisory locks serialize competing reservations.
 INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,group_id,starts_at,ends_at,timezone,title,zoom,recording,recording_expires_at)
 VALUES(e.id,actor,p_course,p_teacher,v_program,v_kind,p_group,ts,ts+CASE WHEN v_kind='group' THEN interval '50 minutes' ELSE interval '30 minutes' END,t.profile->>'timezone',coalesce(g->>'title','One-to-one lesson'),
 coalesce((SELECT value->>'zoom' FROM jsonb_array_elements(t.profile->'groups') WHERE value->>'id'=p_group::text),''),
 coalesce((SELECT value->>'recording' FROM jsonb_array_elements(t.profile->'groups') WHERE value->>'id'=p_group::text),''),ts+make_interval(days=>(SELECT recording_days FROM live_program_settings s WHERE s.program=v_program))) RETURNING id INTO bid;
 RETURN bid;
END $$;
CREATE OR REPLACE FUNCTION book_live_lesson(p_course uuid,p_teacher uuid,p_date date,p_time text DEFAULT NULL,p_group uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT book_live_lesson_for(p_course,p_teacher,p_date,p_time,p_group,auth.uid()) $$;
CREATE FUNCTION staff_live_booking(p_enrollment uuid,p_teacher uuid,p_date date,p_time text DEFAULT NULL,p_group uuid DEFAULT NULL,p_original uuid DEFAULT NULL,p_reason text DEFAULT '',p_return_credit boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE e enrollments; b live_bookings; replacement uuid; tid uuid;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 IF length(trim(p_reason)) NOT BETWEEN 3 AND 500 OR p_reason IS NULL THEN RAISE EXCEPTION 'Enter the reason for this staff action.'; END IF;
 SELECT * INTO e FROM enrollments WHERE id=p_enrollment AND status='active';
 IF e.id IS NULL THEN RAISE EXCEPTION 'Enrollment unavailable.'; END IF;
 SELECT * INTO b FROM live_bookings WHERE id=p_original;
 FOR tid IN SELECT DISTINCT x FROM unnest(ARRAY[p_teacher,b.teacher_id]) x WHERE x IS NOT NULL ORDER BY x LOOP PERFORM pg_advisory_xact_lock(hashtextextended(tid::text,1)); END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(e.user_id::text,2));
 IF p_original IS NOT NULL THEN
  SELECT * INTO b FROM live_bookings WHERE id=p_original FOR UPDATE;
  IF b.enrollment_id IS DISTINCT FROM e.id OR b.status NOT IN ('pending','booked') OR b.starts_at<=now() THEN RAISE EXCEPTION 'Only a future reservation for this enrollment can be rescheduled.'; END IF;
  IF (b.kind='private') IS DISTINCT FROM (p_group IS NULL) THEN RAISE EXCEPTION 'Choose the same lesson type.'; END IF;
  IF b.teacher_id=p_teacher AND ((p_group IS NOT NULL AND p_group=b.group_id) OR (p_group IS NULL AND live_start(p_date,p_time,b.timezone)=b.starts_at)) THEN RAISE EXCEPTION 'Choose a different lesson time or teacher.'; END IF;
  UPDATE live_bookings SET status='cancelled',credit_used=NOT coalesce(p_return_credit,true),cancellation_reason='staff reschedule: '||p_reason,updated_at=now() WHERE id=b.id;
 END IF;
 replacement:=book_live_lesson_for(e.course_id,p_teacher,p_date,p_time,p_group,e.user_id);
 UPDATE live_bookings SET rescheduled_from=p_original,cancellation_reason=NULL WHERE id=replacement;
 INSERT INTO audit_logs(action,entity_type,entity_id,admin_id,admin_name,description) SELECT 'booking_staff_created','booking',replacement::text,id,name,p_reason FROM users WHERE id=auth.uid();
 RETURN replacement;
END $$;
CREATE FUNCTION cancel_live_group(p_teacher uuid,p_group uuid,p_reason text) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b live_bookings; n int:=0;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 IF coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Enter a cancellation reason.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 FOR b IN SELECT * FROM live_bookings WHERE teacher_id=p_teacher AND group_id=p_group AND status IN ('pending','booked') ORDER BY user_id LOOP
  PERFORM update_live_booking(b.id,'cancel'); n:=n+1;
  UPDATE live_bookings SET cancellation_reason='group cancellation: '||p_reason WHERE id=b.id;
 END LOOP;
 UPDATE live_teachers SET profile=jsonb_set(profile,'{groups}',coalesce((SELECT jsonb_agg(g) FROM jsonb_array_elements(profile->'groups') g WHERE g->>'id'<>p_group::text),'[]')),revision=revision+1 WHERE id=p_teacher;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION live_availability_for(uuid,uuid,date,uuid,uuid),book_live_lesson_for(uuid,uuid,date,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION adjust_live_credits(uuid,text,int,text),staff_live_enrollments(),staff_live_availability(uuid,uuid,date,uuid),staff_live_booking(uuid,uuid,date,text,uuid,uuid,text,boolean),cancel_live_group(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION adjust_live_credits(uuid,text,int,text),staff_live_enrollments(),staff_live_availability(uuid,uuid,date,uuid),staff_live_booking(uuid,uuid,date,text,uuid,uuid,text,boolean),cancel_live_group(uuid,uuid,text) TO authenticated;
COMMIT;
