-- Live learning extends existing course IDs and active enrollments. No product replacement.
BEGIN;
CREATE TABLE public.live_teachers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
 email text NOT NULL UNIQUE CHECK (email = lower(trim(email))),
 profile jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 invited_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.live_program_settings (
 program text PRIMARY KEY CHECK(program IN ('language-lab','language-lab-pro','starter-path','hybrid-pack')),
 group_capacity integer NOT NULL DEFAULT 4 CHECK(group_capacity BETWEEN 3 AND 5),
 notice_minutes integer NOT NULL DEFAULT 60 CHECK(notice_minutes BETWEEN 0 AND 10080),
 buffer_minutes integer NOT NULL DEFAULT 0 CHECK(buffer_minutes BETWEEN 0 AND 120),
 cancellation_hours integer CHECK(cancellation_hours BETWEEN 0 AND 720),
 recording_days integer NOT NULL DEFAULT 90 CHECK(recording_days BETWEEN 1 AND 3650)
);
INSERT INTO public.live_program_settings(program) VALUES ('language-lab'),('language-lab-pro'),('starter-path'),('hybrid-pack');
CREATE TABLE public.live_teacher_selections (
 user_id uuid NOT NULL REFERENCES public.users(id),
 course_id uuid NOT NULL REFERENCES public.courses(id),
 teacher_id uuid NOT NULL REFERENCES public.live_teachers(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,course_id)
);
CREATE TABLE public.live_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrollment_id uuid NOT NULL REFERENCES public.enrollments(id),
 user_id uuid NOT NULL REFERENCES public.users(id),
 course_id uuid NOT NULL REFERENCES public.courses(id),
 teacher_id uuid NOT NULL REFERENCES public.live_teachers(id),
 program text NOT NULL REFERENCES public.live_program_settings(program),
 kind text NOT NULL CHECK(kind IN ('group','private')),
 group_id uuid,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at > starts_at),
 timezone text NOT NULL,
 title text NOT NULL,
 status text NOT NULL DEFAULT 'booked' CHECK(status IN ('booked','completed','cancelled','no_show')),
 credit_used boolean NOT NULL DEFAULT true,
 zoom text NOT NULL DEFAULT '',
 recording text NOT NULL DEFAULT '',
 recording_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='private' AND group_id IS NULL) OR (kind='group' AND group_id IS NOT NULL))
);
CREATE INDEX live_bookings_teacher_time ON public.live_bookings(teacher_id,starts_at,ends_at) WHERE status <> 'cancelled';
CREATE INDEX live_bookings_student_time ON public.live_bookings(user_id,starts_at,ends_at) WHERE status <> 'cancelled';
CREATE INDEX live_bookings_credits ON public.live_bookings(enrollment_id,kind) WHERE credit_used;
CREATE INDEX live_bookings_group ON public.live_bookings(group_id) WHERE status <> 'cancelled';
ALTER TABLE public.live_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_teacher_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_bookings ENABLE ROW LEVEL SECURITY;
-- All access is through checked RPCs. Never expose teacher email or meeting URLs in a directory.
REVOKE ALL ON public.live_teachers,public.live_program_settings,public.live_teacher_selections,public.live_bookings FROM anon,authenticated;
GRANT ALL ON public.live_teachers,public.live_program_settings,public.live_teacher_selections,public.live_bookings TO service_role;

CREATE FUNCTION public.live_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND role='admin' AND status='active');
$$;
CREATE FUNCTION public.live_require_user() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Sign in with an active account.'; END IF;
 RETURN auth.uid();
END $$;
CREATE FUNCTION public.live_course_program(p_course uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT level FROM courses WHERE id=p_course AND (product_type='service' OR content_format IN ('live','hybrid')) AND level IN ('language-lab','language-lab-pro','starter-path','hybrid-pack');
$$;
CREATE FUNCTION public.live_start(p_date date,p_time text,p_zone text) RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path=public,pg_temp AS $$
DECLARE result timestamptz; wall timestamp;
BEGIN
 IF p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid lesson time.'; END IF;
 wall:=p_date+p_time::time;
 result:=wall AT TIME ZONE p_zone;
 IF result AT TIME ZONE p_zone <> wall THEN RAISE EXCEPTION 'This time does not exist because of daylight saving. Choose another time.'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.live_safe_url(p_url text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT coalesce(p_url,'')='' OR (length(p_url)<=4096 AND p_url ~ '^https://[^[:space:]]+$');
$$;

CREATE FUNCTION public.save_live_teacher(p_teacher jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); tid uuid:=(p_teacher->>'id')::uuid; oldrow live_teachers; doc jsonb:=p_teacher; w jsonb; w2 jsonb; g jsonb; g2 jsonb; reserved live_bookings; ts timestamptz; cap integer; linked uuid;
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
  IF EXISTS(SELECT 1 FROM live_bookings WHERE teacher_id=tid AND kind='private' AND status<>'cancelled' AND tstzrange(starts_at,ends_at,'[)') && tstzrange(ts,ts+interval '50 minutes','[)')) THEN RAISE EXCEPTION 'A group session overlaps a private booking.'; END IF;
  FOR g2 IN SELECT * FROM jsonb_array_elements(doc->'groups') LOOP
   IF g2->>'id'<>g->>'id' AND tstzrange(live_start((g2->>'date')::date,g2->>'start',doc->>'timezone'),live_start((g2->>'date')::date,g2->>'start',doc->>'timezone')+interval '50 minutes','[)') && tstzrange(ts,ts+interval '50 minutes','[)') THEN RAISE EXCEPTION 'Group sessions overlap.'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM live_bookings WHERE group_id=(g->>'id')::uuid AND status<>'cancelled')>(g->>'capacity')::int THEN RAISE EXCEPTION 'Capacity cannot be lower than existing reservations.'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(doc->'groups'))<>(SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(doc->'groups')) THEN RAISE EXCEPTION 'Duplicate group IDs.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=tid AND b.status='booked' AND b.ends_at>now() AND doc->'daysOff' ? to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD')) THEN RAISE EXCEPTION 'Time off conflicts with an existing reservation.'; END IF;
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

CREATE FUNCTION public.live_workspace() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); admin boolean:=live_is_admin(); own uuid; result jsonb;
BEGIN
 SELECT id INTO own FROM live_teachers WHERE user_id=actor;
 SELECT jsonb_build_object(
 'ownTeacherId',own,
 'teachers',coalesce((SELECT jsonb_agg(CASE WHEN admin OR t.user_id=actor THEN t.profile || jsonb_build_object('revision',t.revision,'userId',t.user_id,'invitedAt',t.invited_at)
 ELSE (t.profile - 'email' - 'groups') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR (t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
 'settings',(SELECT jsonb_object_agg(program,to_jsonb(s)) FROM live_program_settings s),
 'selections',coalesce((SELECT jsonb_object_agg(course_id,teacher_id) FROM live_teacher_selections WHERE user_id=actor),'{}'::jsonb),
 'bookings',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',b.id,'teacherId',b.teacher_id,'courseId',b.course_id,'program',b.program,'date',to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD'),'start',to_char(b.starts_at AT TIME ZONE b.timezone,'HH24:MI'),'startsAt',b.starts_at,'endsAt',b.ends_at,'timezone',b.timezone,'kind',b.kind,'groupId',b.group_id,'title',b.title,'status',b.status,'creditUsed',b.credit_used,'studentName',u.name,
   'zoom',b.zoom,'recording',CASE WHEN admin OR b.teacher_id=own OR b.recording_expires_at>now() THEN b.recording ELSE '' END,
   'canCancel',b.status='booked' AND (admin OR b.teacher_id=own OR (s.cancellation_hours IS NOT NULL AND b.starts_at>now()+make_interval(hours=>s.cancellation_hours)))
 ) ORDER BY b.starts_at) FROM live_bookings b JOIN live_program_settings s ON s.program=b.program JOIN users u ON u.id=b.user_id WHERE admin OR b.teacher_id=own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e WHERE e.id=b.enrollment_id AND e.status='active'))),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.select_live_teacher(p_course uuid,p_teacher uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); program text:=live_course_program(p_course);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 IF program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=p_teacher AND profile->>'status'='active' AND profile->'programs' ? program) THEN RAISE EXCEPTION 'This teacher is unavailable for your program.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings WHERE user_id=actor AND course_id=p_course AND teacher_id<>p_teacher AND status='booked' AND ends_at>now()) THEN RAISE EXCEPTION 'Cancel upcoming lessons before changing your teacher.'; END IF;
 INSERT INTO live_teacher_selections(user_id,course_id,teacher_id) VALUES(actor,p_course,p_teacher) ON CONFLICT(user_id,course_id) DO UPDATE SET teacher_id=excluded.teacher_id,updated_at=now();
END $$;

-- Authoritative availability, including other students' bookings, without exposing their data.
CREATE FUNCTION public.live_availability(p_course uuid,p_teacher uuid,p_date date) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); v_program text:=live_course_program(p_course); t live_teachers; s live_program_settings; w jsonb; g jsonb; ts timestamptz; finish time; starttime time; times jsonb:='[]'; groups jsonb:='[]'; seats int;
BEGIN
 IF v_program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher AND profile->>'status'='active' AND profile->'programs' ? v_program;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Teacher unavailable.'; END IF;
 SELECT * INTO s FROM live_program_settings WHERE live_program_settings.program=v_program;
 IF p_date < (now() AT TIME ZONE (t.profile->>'timezone'))::date OR p_date > current_date+180 THEN RETURN jsonb_build_object('times',times,'groups',groups); END IF;
 IF v_program IN ('starter-path','hybrid-pack') AND NOT(t.profile->'daysOff' ? p_date::text) THEN
  FOR w IN SELECT value FROM jsonb_array_elements(t.profile->'weekly') WHERE (value->>'day')::int=extract(isodow FROM p_date)::int-1 LOOP
   starttime:=(w->>'start')::time; finish:=(w->>'end')::time;
   WHILE starttime+interval '30 minutes'<=finish AND starttime+interval '30 minutes'>starttime LOOP
    ts:=live_start(p_date,left(starttime::text,5),t.profile->>'timezone');
    IF ts>=now()+make_interval(mins=>s.notice_minutes)
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=p_teacher AND b.status<>'cancelled' AND tstzrange(b.starts_at-make_interval(mins=>s.buffer_minutes),b.ends_at+make_interval(mins=>s.buffer_minutes),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.profile->'groups') v WHERE tstzrange(live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')-make_interval(mins=>s.buffer_minutes),live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')+interval '50 minutes'+make_interval(mins=>s.buffer_minutes),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.user_id=actor AND b.status<>'cancelled' AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    THEN times:=times || to_jsonb(left(starttime::text,5)); END IF;
    starttime:=starttime+interval '30 minutes';
   END LOOP;
  END LOOP;
 END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(t.profile->'groups') WHERE value->>'program'=v_program LOOP
  ts:=live_start((g->>'date')::date,g->>'start',t.profile->>'timezone');
  SELECT (g->>'capacity')::int-count(*) INTO seats FROM live_bookings WHERE group_id=(g->>'id')::uuid AND status<>'cancelled';
  IF ts>=now()+make_interval(mins=>s.notice_minutes) AND ts<now()+interval '180 days' AND seats>0 AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.user_id=actor AND b.status<>'cancelled' AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ts,ts+interval '50 minutes','[)')) THEN groups:=groups || jsonb_build_array((g-'zoom'-'recording')||jsonb_build_object('seats',seats)); END IF;
 END LOOP;
 RETURN jsonb_build_object('times',times,'groups',groups);
END $$;

CREATE FUNCTION public.book_live_lesson(p_course uuid,p_teacher uuid,p_date date,p_time text DEFAULT NULL,p_group uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

CREATE FUNCTION public.update_live_booking(p_id uuid,p_action text,p_zoom text DEFAULT '',p_recording text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); b live_bookings; manager boolean; cutoff integer;
BEGIN
 SELECT * INTO b FROM live_bookings WHERE id=p_id;
 IF b.id IS NULL THEN RAISE EXCEPTION 'Lesson not found.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b.teacher_id::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(b.user_id::text,2));
 SELECT * INTO b FROM live_bookings WHERE id=p_id FOR UPDATE;
 manager:=live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers WHERE id=b.teacher_id AND user_id=actor);
 IF NOT manager AND b.user_id<>actor THEN RAISE EXCEPTION 'This lesson is private.'; END IF;
 IF p_action='cancel' THEN
  IF b.status='cancelled' THEN RETURN; END IF;
  SELECT cancellation_hours INTO cutoff FROM live_program_settings WHERE program=b.program;
  IF b.status<>'booked' OR (NOT manager AND (cutoff IS NULL OR b.starts_at<=now()+make_interval(hours=>cutoff))) THEN RAISE EXCEPTION 'Please contact your teacher to cancel this lesson.'; END IF;
  UPDATE live_bookings SET status='cancelled',credit_used=false,updated_at=now() WHERE id=p_id;
 ELSIF manager AND p_action IN ('completed','no_show') THEN
  IF b.status<>'booked' OR b.starts_at>now() THEN RAISE EXCEPTION 'Only a past booked lesson can be marked attended or missed.'; END IF;
  UPDATE live_bookings SET status=p_action,updated_at=now() WHERE id=p_id;
 ELSIF manager AND p_action='media' THEN
  IF NOT live_safe_url(p_zoom) OR NOT live_safe_url(p_recording) THEN RAISE EXCEPTION 'Use HTTPS links.'; END IF;
  UPDATE live_bookings SET zoom=p_zoom,recording=p_recording,recording_expires_at=ends_at+make_interval(days=>(SELECT recording_days FROM live_program_settings WHERE program=b.program)),updated_at=now() WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Action not allowed.';
 END IF;
END $$;

CREATE FUNCTION public.save_live_settings(p_program text,p_settings jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 UPDATE live_program_settings SET group_capacity=(p_settings->>'group_capacity')::int,notice_minutes=(p_settings->>'notice_minutes')::int,buffer_minutes=(p_settings->>'buffer_minutes')::int,cancellation_hours=(p_settings->>'cancellation_hours')::int,recording_days=(p_settings->>'recording_days')::int WHERE program=p_program;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown live program.'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.live_is_admin(),public.live_require_user(),public.live_course_program(uuid),public.live_start(date,text,text),public.live_safe_url(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_live_teacher(jsonb),public.live_workspace(),public.select_live_teacher(uuid,uuid),public.live_availability(uuid,uuid,date),public.book_live_lesson(uuid,uuid,date,text,uuid),public.update_live_booking(uuid,text,text,text),public.save_live_settings(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_live_teacher(jsonb),public.live_workspace(),public.select_live_teacher(uuid,uuid),public.live_availability(uuid,uuid,date),public.book_live_lesson(uuid,uuid,date,text,uuid),public.update_live_booking(uuid,text,text,text),public.save_live_settings(text,jsonb) TO authenticated;
CREATE FUNCTION public.live_teacher_media_allowed(p_teacher text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers WHERE id::text=p_teacher AND user_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.live_teacher_media_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_teacher_media_allowed(text) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('teacher-photos','teacher-photos',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY "Manage own teacher photos" ON storage.objects FOR ALL TO authenticated USING (bucket_id='teacher-photos' AND live_teacher_media_allowed((storage.foldername(name))[1])) WITH CHECK (bucket_id='teacher-photos' AND live_teacher_media_allowed((storage.foldername(name))[1]));
COMMIT;
