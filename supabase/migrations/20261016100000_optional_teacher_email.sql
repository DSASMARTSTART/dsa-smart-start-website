-- Profiles and calendars may be prepared before login email addresses are supplied.
-- Keep an empty string in profile JSON for the client and NULL in the unique column.
BEGIN;
ALTER TABLE public.live_teachers ALTER COLUMN email DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.validate_live_teacher_profile() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE d jsonb:=NEW.profile; item jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['id','name','email','bio','photo','video','timezone','languages','status']) k WHERE jsonb_typeof(d->k) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Teacher profile fields must be text.'; END IF;
 IF d->>'id'<>NEW.id::text OR nullif(d->>'email','') IS DISTINCT FROM NEW.email THEN RAISE EXCEPTION 'Teacher identity does not match the profile.'; END IF;
 IF d ? 'availabilityNotes' AND (jsonb_typeof(d->'availabilityNotes') IS DISTINCT FROM 'string' OR length(d->>'availabilityNotes')>600) THEN RAISE EXCEPTION 'Availability notes must be text up to 600 characters.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'programs') v WHERE jsonb_typeof(v) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Invalid teaching programs.'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(d->'weekly') LOOP
  IF jsonb_typeof(item->'day') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'start') IS DISTINCT FROM 'string' OR jsonb_typeof(item->'end') IS DISTINCT FROM 'string' OR item->>'id' IS NULL THEN RAISE EXCEPTION 'Invalid weekly availability fields.'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(d->'daysOff') v WHERE jsonb_typeof(v) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Invalid days off.'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(d->'groups') LOOP
  IF EXISTS(SELECT 1 FROM unnest(ARRAY['id','date','start','program','title']) k WHERE jsonb_typeof(item->k) IS DISTINCT FROM 'string') OR jsonb_typeof(item->'capacity') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid group session fields.'; END IF;
 END LOOP;
 RETURN NEW;
END $$;

UPDATE public.live_teachers SET email=NULL WHERE email='';
ALTER TABLE public.live_teachers ADD CONSTRAINT live_teachers_email_not_empty CHECK(email IS NULL OR email<>'');
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
 doc:=doc || jsonb_build_object('email',lower(trim(coalesce(doc->>'email',''))));
 IF coalesce(trim(doc->>'name'),'')='' OR (doc->>'email'<>'' AND doc->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') OR length(doc->>'name')>150 OR length(doc->>'bio')>5000 THEN RAISE EXCEPTION 'Enter a valid name, email and introduction.'; END IF;
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
 IF oldrow.email IS DISTINCT FROM nullif(doc->>'email','') AND oldrow.user_id IS NOT NULL THEN RAISE EXCEPTION 'A linked login email cannot be changed here.'; END IF;
 SELECT id INTO linked FROM auth.users WHERE nullif(doc->>'email','') IS NOT NULL AND lower(email)=doc->>'email';
 INSERT INTO live_teachers(id,email,user_id,profile) VALUES(tid,nullif(doc->>'email',''),linked,doc)
 ON CONFLICT(id) DO UPDATE SET email=excluded.email,user_id=coalesce(live_teachers.user_id,excluded.user_id),profile=excluded.profile,revision=live_teachers.revision+1,updated_at=now();
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
COMMIT;
