BEGIN;
-- Validate JSON at the table boundary as well as in the write RPC. Teacher-supplied
-- objects must never become malformed React props or invalid calendar windows.
CREATE FUNCTION public.validate_live_teacher_profile() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE d jsonb:=NEW.profile; item jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['id','name','email','bio','photo','video','timezone','languages','status']) k WHERE jsonb_typeof(d->k) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Teacher profile fields must be text.'; END IF;
 IF d->>'id'<>NEW.id::text OR d->>'email'<>NEW.email THEN RAISE EXCEPTION 'Teacher identity does not match the profile.'; END IF;
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
REVOKE ALL ON FUNCTION public.validate_live_teacher_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_live_teacher_profile BEFORE INSERT OR UPDATE ON public.live_teachers FOR EACH ROW EXECUTE FUNCTION public.validate_live_teacher_profile();
CREATE OR REPLACE FUNCTION public.live_workspace() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); admin boolean:=live_is_admin(); own uuid; result jsonb;
BEGIN
 SELECT id INTO own FROM live_teachers WHERE user_id=actor;
 SELECT jsonb_build_object(
 'ownTeacherId',own,
 'teachers',coalesce((SELECT jsonb_agg(CASE WHEN admin OR t.user_id=actor THEN t.profile || jsonb_build_object('revision',t.revision,'userId',t.user_id,'invitedAt',t.invited_at)
 ELSE (t.profile - 'email' - 'groups') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id WHERE b.teacher_id=t.id AND b.user_id=actor AND e.status='active') OR (t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
 'settings',(SELECT jsonb_object_agg(program,to_jsonb(s)) FROM live_program_settings s),
 'selections',coalesce((SELECT jsonb_object_agg(course_id,teacher_id) FROM live_teacher_selections WHERE user_id=actor),'{}'::jsonb),
 'bookings',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',b.id,'userId',b.user_id,'teacherId',b.teacher_id,'courseId',b.course_id,'program',b.program,'date',to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD'),'start',to_char(b.starts_at AT TIME ZONE b.timezone,'HH24:MI'),'startsAt',b.starts_at,'endsAt',b.ends_at,'timezone',b.timezone,'kind',b.kind,'groupId',b.group_id,'title',b.title,'status',b.status,'creditUsed',b.credit_used,'studentName',u.name,
   'zoom',b.zoom,'recording',CASE WHEN admin OR b.teacher_id=own OR b.recording_expires_at>now() THEN b.recording ELSE '' END,
   'canCancel',b.status='booked' AND (admin OR b.teacher_id=own OR (s.cancellation_hours IS NOT NULL AND b.starts_at>now()+make_interval(hours=>s.cancellation_hours)))
 ) ORDER BY b.starts_at) FROM live_bookings b JOIN live_program_settings s ON s.program=b.program JOIN users u ON u.id=b.user_id WHERE admin OR b.teacher_id=own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e WHERE e.id=b.enrollment_id AND e.status='active'))),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

COMMIT;
