-- Preserve existing confirmed reservations; new requests require admin approval.
BEGIN;
ALTER TABLE live_program_settings ADD COLUMN credit_return_hours integer NOT NULL DEFAULT 72 CHECK(credit_return_hours BETWEEN 0 AND 720);
UPDATE live_program_settings SET notice_minutes=2880,cancellation_hours=48,credit_return_hours=72;
ALTER TABLE live_bookings DROP CONSTRAINT live_bookings_status_check;
ALTER TABLE live_bookings ADD CONSTRAINT live_bookings_status_check CHECK(status IN ('pending','booked','completed','cancelled','no_show'));
ALTER TABLE live_bookings ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE live_bookings ADD COLUMN approved_at timestamptz, ADD COLUMN approved_by uuid REFERENCES users(id),
 ADD COLUMN cancellation_reason text, ADD COLUMN rescheduled_from uuid REFERENCES live_bookings(id);
CREATE UNIQUE INDEX live_booking_single_replacement ON live_bookings(rescheduled_from) WHERE rescheduled_from IS NOT NULL;
-- Per-enrollment dates can be configured once the course-duration policy is agreed.
-- Until then the existing recording access deadline is preserved.
CREATE TABLE live_course_terms (
 enrollment_id uuid PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
 course_ends_at timestamptz NOT NULL,
 downloads_until timestamptz NOT NULL CHECK(downloads_until>=course_ends_at),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE live_course_terms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_course_terms FROM PUBLIC,anon,authenticated;
GRANT ALL ON live_course_terms TO service_role;
CREATE OR REPLACE FUNCTION public.save_live_teacher(p_teacher jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); tid uuid:=(p_teacher->>'id')::uuid; oldrow live_teachers; doc jsonb:=p_teacher; w jsonb; w2 jsonb; g jsonb; g2 jsonb; reserved live_bookings; ts timestamptz; cap integer; linked uuid; gap integer;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher ID required.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(tid::text,1));
 SELECT * INTO oldrow FROM live_teachers WHERE id=tid FOR UPDATE;
 IF NOT live_is_admin() AND (oldrow.user_id IS NULL OR oldrow.user_id<>actor) THEN RAISE EXCEPTION 'Only administrators or this teacher may edit this profile.'; END IF;
 IF oldrow.id IS NOT NULL AND coalesce((doc->>'revision')::int,0)<>oldrow.revision THEN RAISE EXCEPTION 'This profile changed in another session. Refresh before saving.'; END IF;
 IF NOT live_is_admin() THEN
   doc:=doc || jsonb_build_object('email',oldrow.email,'status',oldrow.profile->>'status','programs',oldrow.profile->'programs');
 END IF;
 doc:=doc - 'userId' - 'invitedAt' - 'revision';
 doc:=doc || jsonb_build_object('email',lower(trim(doc->>'email')));
 IF coalesce(trim(doc->>'name'),'')='' OR coalesce(doc->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(doc->>'name')>150 OR length(doc->>'bio')>5000 THEN RAISE EXCEPTION 'Enter a valid name, email and introduction.'; END IF;
 IF doc->>'status' NOT IN ('draft','active','inactive') OR doc->>'status' IS NULL THEN RAISE EXCEPTION 'Invalid teacher status.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=doc->>'timezone') THEN RAISE EXCEPTION 'Choose a valid time zone.'; END IF;
 IF NOT live_safe_url(doc->>'photo') OR NOT live_safe_url(doc->>'video') THEN RAISE EXCEPTION 'Use HTTPS media links.'; END IF;
 IF jsonb_typeof(doc->'programs') IS DISTINCT FROM 'array' OR jsonb_array_length(doc->'programs')=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(doc->'programs') p WHERE p NOT IN (SELECT program FROM live_program_settings)) THEN RAISE EXCEPTION 'Choose supported teaching programs.'; END IF;
 IF jsonb_typeof(doc->'weekly') IS DISTINCT FROM 'array' OR jsonb_typeof(doc->'groups') IS DISTINCT FROM 'array' OR jsonb_typeof(doc->'daysOff') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid calendar.'; END IF;
 IF jsonb_array_length(doc->'weekly')>50 OR jsonb_array_length(doc->'groups')>500 OR jsonb_array_length(doc->'daysOff')>366 THEN RAISE EXCEPTION 'Calendar limit exceeded.'; END IF;
 IF oldrow.id IS NOT NULL AND oldrow.profile->>'timezone'<>doc->>'timezone' AND (EXISTS(SELECT 1 FROM live_bookings WHERE teacher_id=tid AND status<>'cancelled' AND ends_at>now()) OR jsonb_array_length(oldrow.profile->'groups')>0) THEN RAISE EXCEPTION 'Keep the time zone while scheduled lessons exist.'; END IF;
 FOR w IN SELECT * FROM jsonb_array_elements(doc->'weekly') LOOP
  IF NOT(w ?& ARRAY['id','day','start','end']) THEN RAISE EXCEPTION 'Availability fields are required.'; END IF;
  IF (w->>'day')::int NOT BETWEEN 0 AND 6 OR w->>'start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR w->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (w->>'end')::time-(w->>'start')::time<interval '30 minutes' THEN RAISE EXCEPTION 'Invalid availability window.'; END IF;
  FOR w2 IN SELECT * FROM jsonb_array_elements(doc->'weekly') LOOP
   IF w2<>w AND w2->>'day'=w->>'day' AND (w2->>'start')::time<(w->>'end')::time AND (w2->>'end')::time>(w->>'start')::time THEN RAISE EXCEPTION 'Availability windows overlap.'; END IF;
  END LOOP;
 END LOOP;
 FOR w IN SELECT * FROM jsonb_array_elements(doc->'daysOff') LOOP PERFORM (w #>> '{}')::date; END LOOP;
 SELECT coalesce(max(buffer_minutes),0) INTO gap FROM live_program_settings WHERE doc->'programs' ? program;
 FOR g IN SELECT * FROM jsonb_array_elements(doc->'groups') LOOP
  IF NOT(g ?& ARRAY['id','date','start','program','capacity','title']) THEN RAISE EXCEPTION 'Group session fields are required.'; END IF;
  PERFORM (g->>'id')::uuid;
  IF EXISTS(SELECT 1 FROM live_teachers other,jsonb_array_elements(other.profile->'groups') v WHERE other.id<>tid AND v->>'id'=g->>'id') THEN RAISE EXCEPTION 'Group session ID belongs to another teacher.'; END IF;
  IF NOT (doc->'programs' ? (g->>'program')) OR g->>'program'='starter-path' THEN RAISE EXCEPTION 'Group program is not taught by this teacher.'; END IF;
  SELECT group_capacity INTO cap FROM live_program_settings WHERE program=g->>'program';
  IF (g->>'capacity')::int NOT BETWEEN 3 AND 5 THEN RAISE EXCEPTION 'Group capacity must be 3–5.'; END IF;
  IF NOT live_safe_url(g->>'zoom') OR NOT live_safe_url(g->>'recording') THEN RAISE EXCEPTION 'Use HTTPS meeting and recording links.'; END IF;
  IF doc->'daysOff' ? (g->>'date') THEN RAISE EXCEPTION 'A group lesson conflicts with time off.'; END IF;
  ts:=live_start((g->>'date')::date,g->>'start',doc->>'timezone');
  IF ts<=now() AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(oldrow.profile->'groups','[]')) v WHERE v->>'id'=g->>'id' AND v->>'date'=g->>'date' AND v->>'start'=g->>'start') THEN RAISE EXCEPTION 'Choose a future group session time.'; END IF;
  IF (g->>'start')::time+interval '50 minutes'<(g->>'start')::time THEN RAISE EXCEPTION 'Group lessons must end before midnight.'; END IF;
  IF EXISTS(SELECT 1 FROM live_bookings WHERE teacher_id=tid AND kind='private' AND status<>'cancelled' AND tstzrange(starts_at-make_interval(mins=>gap),ends_at+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '50 minutes','[)')) THEN RAISE EXCEPTION 'A group session overlaps a private booking or its required break.'; END IF;
  FOR g2 IN SELECT * FROM jsonb_array_elements(doc->'groups') LOOP
   IF g2->>'id'<>g->>'id' AND tstzrange(live_start((g2->>'date')::date,g2->>'start',doc->>'timezone')-make_interval(mins=>gap),live_start((g2->>'date')::date,g2->>'start',doc->>'timezone')+interval '50 minutes'+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '50 minutes','[)') THEN RAISE EXCEPTION 'Group sessions overlap or leave too little break.'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM live_bookings WHERE group_id=(g->>'id')::uuid AND status<>'cancelled')>(g->>'capacity')::int THEN RAISE EXCEPTION 'Capacity cannot be lower than existing reservations.'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(doc->'groups'))<>(SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(doc->'groups')) THEN RAISE EXCEPTION 'Duplicate group IDs.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=tid AND b.status IN ('pending','booked') AND b.ends_at>now() AND doc->'daysOff' ? to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD')) THEN RAISE EXCEPTION 'Time off conflicts with an existing reservation.'; END IF;
 FOR reserved IN SELECT * FROM live_bookings WHERE teacher_id=tid AND group_id IS NOT NULL AND status<>'cancelled' LOOP
  SELECT value INTO g FROM jsonb_array_elements(doc->'groups') WHERE value->>'id'=reserved.group_id::text;
  IF g IS NULL OR g->>'program'<>reserved.program OR live_start((g->>'date')::date,g->>'start',doc->>'timezone')<>reserved.starts_at THEN RAISE EXCEPTION 'A reserved group session cannot be removed or moved. Cancel its reservations first.'; END IF;
 END LOOP;
 IF oldrow.email IS DISTINCT FROM doc->>'email' AND oldrow.user_id IS NOT NULL THEN RAISE EXCEPTION 'A linked login email cannot be changed here.'; END IF;
 SELECT id INTO linked FROM auth.users WHERE lower(email)=doc->>'email';
 INSERT INTO live_teachers(id,email,user_id,profile) VALUES(tid,doc->>'email',linked,doc)
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,profile=excluded.profile,revision=live_teachers.revision+1,updated_at=now();
 -- Group media references propagate to the reservations; only enrolled attendees receive them.
 UPDATE live_bookings b SET zoom=coalesce(grp.value->>'zoom',''),recording=coalesce(grp.value->>'recording',''),recording_expires_at=b.ends_at+make_interval(days=>s.recording_days),updated_at=now()
 FROM jsonb_array_elements(doc->'groups') grp(value),live_program_settings s
 WHERE b.teacher_id=tid AND b.group_id=(grp.value->>'id')::uuid AND s.program=b.program;
 RETURN tid;
END $$;
CREATE OR REPLACE FUNCTION public.select_live_teacher(p_course uuid,p_teacher uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); program text:=live_course_program(p_course);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 IF program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=p_teacher AND user_id IS NOT NULL AND profile->>'status'='active' AND profile->'programs' ? program) THEN RAISE EXCEPTION 'This teacher is unavailable for your program.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings WHERE user_id=actor AND course_id=p_course AND teacher_id<>p_teacher AND status IN ('pending','booked') AND ends_at>now()) THEN RAISE EXCEPTION 'Cancel upcoming lessons before changing your teacher.'; END IF;
 INSERT INTO live_teacher_selections(user_id,course_id,teacher_id) VALUES(actor,p_course,p_teacher) ON CONFLICT(user_id,course_id) DO UPDATE SET teacher_id=excluded.teacher_id,updated_at=now();
END $$;
DROP FUNCTION public.live_availability(uuid,uuid,date);
CREATE OR REPLACE FUNCTION public.live_availability(p_course uuid,p_teacher uuid,p_date date,p_reschedule uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); v_program text:=live_course_program(p_course); t live_teachers; s live_program_settings; w jsonb; g jsonb; ts timestamptz; finish time; starttime time; times jsonb:='[]'; groups jsonb:='[]'; seats int; gap integer; original live_bookings;
BEGIN
 IF v_program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 IF p_reschedule IS NOT NULL THEN
  SELECT * INTO original FROM live_bookings WHERE id=p_reschedule;
  IF original.user_id IS DISTINCT FROM actor OR original.course_id<>p_course OR original.teacher_id<>p_teacher OR original.status NOT IN ('pending','booked') THEN RAISE EXCEPTION 'This reservation cannot be rescheduled.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM live_program_settings s WHERE s.program=original.program AND s.cancellation_hours IS NOT NULL AND original.starts_at>=now()+make_interval(hours=>s.cancellation_hours)) THEN RAISE EXCEPTION 'Rescheduling requires at least 48 hours notice.'; END IF;
 END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher AND user_id IS NOT NULL AND profile->>'status'='active' AND profile->'programs' ? v_program;
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
CREATE OR REPLACE FUNCTION public.book_live_lesson(p_course uuid,p_teacher uuid,p_date date,p_time text DEFAULT NULL,p_group uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); v_program text:=live_course_program(p_course); e enrollments; t live_teachers; avail jsonb; g jsonb; ts timestamptz; v_kind text; allowance int; bid uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 SELECT * INTO e FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active' FOR UPDATE;
 IF e.id IS NULL OR v_program IS NULL THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher;
 IF NOT EXISTS(SELECT 1 FROM live_teacher_selections WHERE user_id=actor AND course_id=p_course AND teacher_id=p_teacher) THEN RAISE EXCEPTION 'Choose this teacher before booking.'; END IF;
 v_kind:=CASE WHEN p_group IS NULL THEN 'private' ELSE 'group' END;
 allowance:=CASE WHEN v_kind='private' THEN CASE WHEN v_program IN ('starter-path','hybrid-pack') THEN 5 ELSE 0 END ELSE CASE v_program WHEN 'hybrid-pack' THEN 25 WHEN 'language-lab' THEN 8 WHEN 'language-lab-pro' THEN 30 ELSE 0 END END;
 IF (SELECT count(*) FROM live_bookings b WHERE b.enrollment_id=e.id AND b.kind=v_kind AND b.credit_used)>=allowance THEN RAISE EXCEPTION 'No remaining credits for this lesson type.'; END IF;
 avail:=live_availability(p_course,p_teacher,p_date);
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

CREATE OR REPLACE FUNCTION public.update_live_booking(p_id uuid,p_action text,p_zoom text DEFAULT '',p_recording text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); b live_bookings; manager boolean; s live_program_settings;
BEGIN
 SELECT * INTO b FROM live_bookings WHERE id=p_id;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Lesson not found.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b.teacher_id::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(b.user_id::text,2));
 SELECT * INTO b FROM live_bookings WHERE id=p_id FOR UPDATE;
 manager:=live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers WHERE id=b.teacher_id AND user_id=actor);
 IF NOT manager AND b.user_id<>actor THEN RAISE EXCEPTION 'This lesson is private.'; END IF;
 SELECT * INTO s FROM live_program_settings WHERE program=b.program;
 IF p_action='approve' THEN
  IF NOT live_is_admin() THEN RAISE EXCEPTION 'Only administration can approve lesson requests.'; END IF;
  IF b.status='booked' THEN RETURN; END IF;
  IF b.status<>'pending' OR b.starts_at<=now() THEN RAISE EXCEPTION 'Only future pending requests can be approved.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM enrollments WHERE id=b.enrollment_id AND status='active') THEN RAISE EXCEPTION 'Student access has been revoked.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=b.teacher_id AND profile->>'status'='active') THEN RAISE EXCEPTION 'Teacher is inactive. Reject this request and arrange another teacher.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM live_course_terms WHERE enrollment_id=b.enrollment_id AND course_ends_at>=b.ends_at) THEN RAISE EXCEPTION 'Set this student’s course end and download deadline in Programs & rules before approving.'; END IF;
  UPDATE live_bookings SET status='booked',approved_at=now(),approved_by=actor,updated_at=now() WHERE id=p_id;
 ELSIF p_action='reject' THEN
  IF NOT live_is_admin() THEN RAISE EXCEPTION 'Only administration can reject lesson requests.'; END IF;
  IF b.status='cancelled' AND b.cancellation_reason='rejected' THEN RETURN; END IF;
  IF b.status<>'pending' THEN RAISE EXCEPTION 'Only pending requests can be rejected.'; END IF;
  UPDATE live_bookings SET status='cancelled',credit_used=false,cancellation_reason='rejected',updated_at=now() WHERE id=p_id;
 ELSIF p_action IN ('cancel','student_cancel') THEN
  IF b.status='cancelled' THEN RETURN; END IF;
  IF b.status NOT IN ('pending','booked') THEN RAISE EXCEPTION 'Only pending or confirmed lessons can be cancelled.'; END IF;
  IF NOT manager AND (s.cancellation_hours IS NULL OR b.starts_at<now()+make_interval(hours=>s.cancellation_hours)) THEN RAISE EXCEPTION 'Please contact your teacher: cancellation requires at least 48 hours notice.'; END IF;
  UPDATE live_bookings SET status='cancelled',
   credit_used=CASE WHEN manager AND p_action='cancel' THEN false ELSE b.starts_at<now()+make_interval(hours=>s.credit_return_hours) END,
   cancellation_reason=CASE WHEN manager AND p_action='cancel' THEN 'teacher' ELSE 'student' END,updated_at=now() WHERE id=p_id;
 ELSIF manager AND p_action IN ('completed','no_show') THEN
  IF b.status<>'booked' OR b.ends_at>now() THEN RAISE EXCEPTION 'Only an ended confirmed lesson can be marked attended or missed.'; END IF;
  UPDATE live_bookings SET status=p_action,updated_at=now() WHERE id=p_id;
 ELSIF manager AND p_action='media' THEN
  IF NOT live_safe_url(p_zoom) OR NOT live_safe_url(p_recording) THEN RAISE EXCEPTION 'Use HTTPS links.'; END IF;
  UPDATE live_bookings SET zoom=p_zoom,recording=p_recording,updated_at=now() WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Action not allowed.';
 END IF;
END $$;

CREATE FUNCTION public.reschedule_live_lesson(p_id uuid,p_date date,p_time text DEFAULT NULL,p_group uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); b live_bookings; s live_program_settings; replacement uuid;
BEGIN
 SELECT * INTO b FROM live_bookings WHERE id=p_id;
 IF b.user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Only the student can reschedule this reservation.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b.teacher_id::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 SELECT * INTO b FROM live_bookings WHERE id=p_id FOR UPDATE;
 SELECT * INTO s FROM live_program_settings WHERE program=b.program;
 IF b.status NOT IN ('pending','booked') OR s.cancellation_hours IS NULL OR b.starts_at<now()+make_interval(hours=>s.cancellation_hours) THEN RAISE EXCEPTION 'Rescheduling requires at least 48 hours notice.'; END IF;
 IF (b.kind='private') IS DISTINCT FROM (p_group IS NULL) THEN RAISE EXCEPTION 'Choose the same lesson type.'; END IF;
 IF (p_group IS NOT NULL AND p_group=b.group_id) OR (p_group IS NULL AND live_start(p_date,p_time,b.timezone)=b.starts_at) THEN RAISE EXCEPTION 'Choose a different lesson time.'; END IF;
 -- Same transaction: failure to obtain a replacement rolls back the cancellation.
 UPDATE live_bookings SET status='cancelled',credit_used=b.starts_at<now()+make_interval(hours=>s.credit_return_hours),cancellation_reason='rescheduled',updated_at=now() WHERE id=p_id;
 replacement:=book_live_lesson(b.course_id,b.teacher_id,p_date,p_time,p_group);
 UPDATE live_bookings SET rescheduled_from=p_id WHERE id=replacement;
 RETURN replacement;
END $$;

CREATE OR REPLACE FUNCTION public.save_live_settings(p_program text,p_settings jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 IF (p_settings->>'credit_return_hours')::int<(p_settings->>'cancellation_hours')::int THEN RAISE EXCEPTION 'The credit-return cutoff must be at least the self-service cutoff.'; END IF;
 UPDATE live_program_settings SET group_capacity=(p_settings->>'group_capacity')::int,notice_minutes=(p_settings->>'notice_minutes')::int,buffer_minutes=(p_settings->>'buffer_minutes')::int,cancellation_hours=(p_settings->>'cancellation_hours')::int,credit_return_hours=coalesce((p_settings->>'credit_return_hours')::int,credit_return_hours),recording_days=(p_settings->>'recording_days')::int WHERE program=p_program;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown program.'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.live_workspace() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); admin boolean:=live_is_admin(); own uuid; result jsonb;
BEGIN
 SELECT id INTO own FROM live_teachers WHERE user_id=actor;
 SELECT jsonb_build_object(
 'ownTeacherId',own,
 'teachers',coalesce((SELECT jsonb_agg(CASE WHEN admin OR t.user_id=actor THEN t.profile || jsonb_build_object('revision',t.revision,'userId',t.user_id,'invitedAt',t.invited_at)
 ELSE (t.profile - 'email' - 'groups') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id WHERE b.teacher_id=t.id AND b.user_id=actor AND e.status='active') OR (t.user_id IS NOT NULL AND t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
 'settings',(SELECT jsonb_object_agg(program,to_jsonb(s)) FROM live_program_settings s),
 'selections',coalesce((SELECT jsonb_object_agg(course_id,teacher_id) FROM live_teacher_selections WHERE user_id=actor),'{}'::jsonb),
 'bookings',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',b.id,'userId',b.user_id,'teacherId',b.teacher_id,'courseId',b.course_id,'program',b.program,'date',to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD'),'start',to_char(b.starts_at AT TIME ZONE b.timezone,'HH24:MI'),'startsAt',b.starts_at,'endsAt',b.ends_at,'timezone',b.timezone,'kind',b.kind,'groupId',b.group_id,'title',b.title,'status',b.status,'creditUsed',b.credit_used,'studentName',u.name,
   'zoom',CASE WHEN admin OR b.teacher_id IS NOT DISTINCT FROM own OR b.status='booked' THEN b.zoom ELSE '' END,
   'recording',CASE WHEN admin OR b.teacher_id IS NOT DISTINCT FROM own OR (b.status IN ('booked','completed','no_show') AND coalesce(ct.course_ends_at,b.recording_expires_at)>now()) THEN b.recording ELSE '' END,
   'canApprove',admin AND b.status='pending' AND b.starts_at>now(),
   'canReject',admin AND b.status='pending',
   'canReschedule',b.user_id=actor AND b.status IN ('pending','booked') AND s.cancellation_hours IS NOT NULL AND b.starts_at>=now()+make_interval(hours=>s.cancellation_hours),
   'cancelReturnsCredit',(admin OR b.teacher_id IS NOT DISTINCT FROM own OR b.starts_at>=now()+make_interval(hours=>s.credit_return_hours)),
   'rescheduleReturnsCredit',b.starts_at>=now()+make_interval(hours=>s.credit_return_hours),
   'cancellationReason',b.cancellation_reason,'rescheduledFrom',b.rescheduled_from,
   'courseEndsAt',ct.course_ends_at,'downloadsUntil',ct.downloads_until,
   'canCancel',b.status IN ('pending','booked') AND (admin OR b.teacher_id IS NOT DISTINCT FROM own OR (s.cancellation_hours IS NOT NULL AND b.starts_at>=now()+make_interval(hours=>s.cancellation_hours)))
 ) ORDER BY b.starts_at) FROM live_bookings b JOIN live_program_settings s ON s.program=b.program JOIN users u ON u.id=b.user_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id WHERE admin OR b.teacher_id IS NOT DISTINCT FROM own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e WHERE e.id=b.enrollment_id AND (e.status='active' OR (e.status='completed' AND ct.downloads_until>now()))))),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.live_availability(uuid,uuid,date,uuid),public.reschedule_live_lesson(uuid,date,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_availability(uuid,uuid,date,uuid),public.reschedule_live_lesson(uuid,date,text,uuid) TO authenticated;
COMMIT;
