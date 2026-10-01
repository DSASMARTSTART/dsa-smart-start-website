BEGIN;
CREATE TABLE live_group_sessions(id uuid PRIMARY KEY,teacher_id uuid NOT NULL REFERENCES live_teachers(id),starts_at timestamptz NOT NULL,session jsonb NOT NULL);
CREATE INDEX live_group_sessions_teacher_date ON live_group_sessions(teacher_id,starts_at);
ALTER TABLE live_group_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON live_group_sessions FROM PUBLIC,anon,authenticated;
GRANT ALL ON live_group_sessions TO service_role;
INSERT INTO live_group_sessions SELECT (g->>'id')::uuid,t.id,live_start((g->>'date')::date,g->>'start',t.profile->>'timezone'),g FROM live_teachers t,jsonb_array_elements(t.profile->'groups') g;
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
 IF jsonb_array_length(doc->'weekly')>50 OR (SELECT count(*) FROM jsonb_array_elements(doc->'groups') item WHERE (item->>'date')::date>=current_date)>500 OR jsonb_array_length(doc->'daysOff')>366 THEN RAISE EXCEPTION 'Calendar limit exceeded.'; END IF;
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
 FOR reserved IN SELECT * FROM live_bookings WHERE teacher_id=tid AND group_id IS NOT NULL AND status<>'cancelled' AND ends_at>now() LOOP
  SELECT value INTO g FROM jsonb_array_elements(doc->'groups') WHERE value->>'id'=reserved.group_id::text;
  IF g IS NULL OR g->>'program'<>reserved.program OR live_start((g->>'date')::date,g->>'start',doc->>'timezone')<>reserved.starts_at THEN RAISE EXCEPTION 'A reserved group session cannot be removed or moved. Cancel its reservations first.'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM live_group_sessions h,jsonb_array_elements(doc->'groups') item WHERE h.id=(item->>'id')::uuid AND h.teacher_id<>tid) THEN RAISE EXCEPTION 'Group session ID belongs to another teacher.'; END IF;
 IF oldrow.email IS DISTINCT FROM doc->>'email' AND oldrow.user_id IS NOT NULL THEN RAISE EXCEPTION 'A linked login email cannot be changed here.'; END IF;
 SELECT id INTO linked FROM auth.users WHERE lower(email)=doc->>'email';
 INSERT INTO live_teachers(id,email,user_id,profile) VALUES(tid,doc->>'email',linked,doc)
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,profile=excluded.profile,revision=live_teachers.revision+1,updated_at=now();
 -- Group media references propagate to the reservations; only enrolled attendees receive them.
 UPDATE live_bookings b SET zoom=coalesce(grp.value->>'zoom',''),recording=coalesce(grp.value->>'recording',''),recording_expires_at=b.ends_at+make_interval(days=>s.recording_days),updated_at=now()
 FROM jsonb_array_elements(doc->'groups') grp(value),live_program_settings s
 WHERE b.teacher_id=tid AND b.group_id=(grp.value->>'id')::uuid AND s.program=b.program;
 DELETE FROM live_group_sessions h WHERE h.teacher_id=tid AND h.starts_at>now() AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'groups') item WHERE item->>'id'=h.id::text);
 INSERT INTO live_group_sessions(id,teacher_id,starts_at,session)
 SELECT (item->>'id')::uuid,tid,live_start((item->>'date')::date,item->>'start',doc->>'timezone'),item FROM jsonb_array_elements(doc->'groups') item
 ON CONFLICT(id) DO UPDATE SET session=excluded.session,starts_at=excluded.starts_at;
 -- The directory keeps the current calendar; historical sessions remain in their own table.
 UPDATE live_teachers SET profile=jsonb_set(profile,'{groups}',coalesce((SELECT jsonb_agg(item) FROM jsonb_array_elements(doc->'groups') item WHERE live_start((item->>'date')::date,item->>'start',doc->>'timezone')+interval '50 minutes'>now()),'[]')) WHERE id=tid;
 RETURN tid;
END $$;
DROP FUNCTION live_workspace();
CREATE OR REPLACE FUNCTION public.live_workspace(p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); admin boolean:=live_is_admin(); own uuid; result jsonb;
BEGIN
 SELECT id INTO own FROM live_teachers WHERE user_id=actor;
 WITH visible AS MATERIALIZED (SELECT b.* FROM live_bookings b WHERE admin OR b.teacher_id=own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE e.id=b.enrollment_id AND (e.status='active' OR e.status='completed' AND ct.downloads_until>now())))),
 past AS MATERIALIZED (SELECT * FROM visible WHERE starts_at<now() AND (p_before IS NULL OR (starts_at,id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) ORDER BY starts_at DESC,id DESC LIMIT CASE WHEN admin OR own IS NOT NULL THEN 50 ELSE 100000 END),
 chosen AS (SELECT * FROM visible WHERE starts_at>=now() AND p_before IS NULL UNION ALL SELECT * FROM past)
 SELECT jsonb_build_object(
 'historyCursor',CASE WHEN (admin OR own IS NOT NULL) AND (SELECT count(*) FROM past)=50 THEN (SELECT jsonb_build_object('at',starts_at,'id',id) FROM past ORDER BY starts_at,id LIMIT 1) ELSE NULL END,
 'credits',coalesce((SELECT jsonb_object_agg(course_id,jsonb_build_object('private',live_credit_allowance(id,'private'),'group',live_credit_allowance(id,'group'))) FROM enrollments WHERE user_id=actor AND status='active'),'{}'),
 'ownTeacherId',own,
 'teachers',coalesce((SELECT jsonb_agg(CASE WHEN admin OR t.user_id=actor THEN t.profile || jsonb_build_object('revision',t.revision,'userId',t.user_id,'invitedAt',t.invited_at)
 ELSE (t.profile - 'email' - 'groups') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id WHERE b.teacher_id=t.id AND b.user_id=actor AND e.status='active') OR (t.user_id IS NOT NULL AND t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
 'settings',(SELECT jsonb_object_agg(program,to_jsonb(s)||jsonb_build_object('display_price',(SELECT string_agg(DISTINCT (c.pricing->>'currency')||' '||(c.pricing->>'price'),' / ') FROM courses c WHERE live_course_program(c.id)=s.program AND c.is_published))) FROM live_program_settings s),
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
 ) ORDER BY b.starts_at) FROM chosen b JOIN live_program_settings s ON s.program=b.program JOIN users u ON u.id=b.user_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id WHERE admin OR b.teacher_id IS NOT DISTINCT FROM own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e WHERE e.id=b.enrollment_id AND (e.status='active' OR (e.status='completed' AND ct.downloads_until>now()))))),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION live_workspace(timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION live_workspace(timestamptz,uuid) TO authenticated;
CREATE FUNCTION live_group_history(p_teacher uuid,p_before timestamptz DEFAULT now()) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT live_is_admin() AND NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=p_teacher AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Teacher access required.'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(session ORDER BY starts_at DESC),'[]') FROM (SELECT * FROM live_group_sessions WHERE teacher_id=p_teacher AND starts_at<p_before ORDER BY starts_at DESC LIMIT 50) x);
END $$;
REVOKE ALL ON FUNCTION live_group_history(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION live_group_history(uuid,timestamptz) TO authenticated;
COMMIT;
