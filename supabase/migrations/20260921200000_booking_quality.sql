-- Booking audit: completion only after a lesson ends; consistent teacher breaks.
-- No commercial policy values or existing bookings are changed.
BEGIN;
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

CREATE OR REPLACE FUNCTION public.live_availability(p_course uuid,p_teacher uuid,p_date date) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); v_program text:=live_course_program(p_course); t live_teachers; s live_program_settings; w jsonb; g jsonb; ts timestamptz; finish time; starttime time; times jsonb:='[]'; groups jsonb:='[]'; seats int; gap integer;
BEGIN
 IF v_program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher AND profile->>'status'='active' AND profile->'programs' ? v_program;
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
    IF ts>=now()+make_interval(mins=>s.notice_minutes)
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=p_teacher AND b.status<>'cancelled' AND tstzrange(b.starts_at-make_interval(mins=>gap),b.ends_at+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.profile->'groups') v WHERE tstzrange(live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')-make_interval(mins=>gap),live_start((v->>'date')::date,v->>'start',t.profile->>'timezone')+interval '50 minutes'+make_interval(mins=>gap),'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.user_id=actor AND b.status<>'cancelled' AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(ts,ts+interval '30 minutes','[)'))
    THEN times:=times || to_jsonb(left(starttime::text,5)); END IF;
    EXIT WHEN starttime+make_interval(mins=>30+gap)<=starttime;
    starttime:=starttime+make_interval(mins=>30+gap);
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

CREATE OR REPLACE FUNCTION public.update_live_booking(p_id uuid,p_action text,p_zoom text DEFAULT '',p_recording text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
  IF b.status<>'booked' OR b.ends_at>now() THEN RAISE EXCEPTION 'Only an ended booked lesson can be marked attended or missed.'; END IF;
  UPDATE live_bookings SET status=p_action,updated_at=now() WHERE id=p_id;
 ELSIF manager AND p_action='media' THEN
  IF NOT live_safe_url(p_zoom) OR NOT live_safe_url(p_recording) THEN RAISE EXCEPTION 'Use HTTPS links.'; END IF;
  UPDATE live_bookings SET zoom=p_zoom,recording=p_recording,recording_expires_at=ends_at+make_interval(days=>(SELECT recording_days FROM live_program_settings WHERE program=b.program)),updated_at=now() WHERE id=p_id;
 ELSE RAISE EXCEPTION 'Action not allowed.';
 END IF;
END $$;
COMMIT;
