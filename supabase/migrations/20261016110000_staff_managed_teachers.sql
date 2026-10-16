-- Active teachers may be booked before their workspace login is connected.
-- Existing linked accounts must remain active; enrollment and booking checks stay in place.
BEGIN;
CREATE OR REPLACE FUNCTION public.select_live_teacher(p_course uuid,p_teacher uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); program text:=live_course_program(p_course);
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,2));
 IF program IS NULL OR NOT EXISTS(SELECT 1 FROM enrollments WHERE user_id=actor AND course_id=p_course AND status='active') THEN RAISE EXCEPTION 'An active live package is required.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM live_teachers t WHERE id=p_teacher AND (t.user_id IS NULL OR EXISTS(SELECT 1 FROM users account WHERE account.id=t.user_id AND account.status='active')) AND profile->>'status'='active' AND profile->'programs' ? program) THEN RAISE EXCEPTION 'This teacher is unavailable for your program.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings WHERE user_id=actor AND course_id=p_course AND teacher_id<>p_teacher AND status IN ('pending','booked') AND ends_at>now()) THEN RAISE EXCEPTION 'Cancel upcoming lessons before changing your teacher.'; END IF;
 INSERT INTO live_teacher_selections(user_id,course_id,teacher_id) VALUES(actor,p_course,p_teacher) ON CONFLICT(user_id,course_id) DO UPDATE SET teacher_id=excluded.teacher_id,updated_at=now();
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
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher AND (user_id IS NULL OR EXISTS(SELECT 1 FROM users account WHERE account.id=live_teachers.user_id AND account.status='active')) AND profile->>'status'='active' AND profile->'programs' ? v_program;
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
CREATE OR REPLACE FUNCTION public.live_workspace(p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); admin boolean:=live_is_admin(); own uuid; result jsonb;
BEGIN
 SELECT id INTO own FROM live_teachers WHERE user_id=actor;
 WITH visible AS MATERIALIZED (SELECT b.* FROM live_bookings b WHERE admin OR b.teacher_id=own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE e.id=b.enrollment_id AND (e.status='active' OR e.status='completed' AND (ct.downloads_until IS NULL OR ct.downloads_until>now()))))),
 past AS MATERIALIZED (SELECT * FROM visible WHERE starts_at<now() AND (p_before IS NULL OR (starts_at,id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) ORDER BY starts_at DESC,id DESC LIMIT CASE WHEN admin OR own IS NOT NULL THEN 50 ELSE 100000 END),
 chosen AS (SELECT * FROM visible WHERE starts_at>=now() AND p_before IS NULL UNION ALL SELECT * FROM past)
 SELECT jsonb_build_object(
 'historyCursor',CASE WHEN (admin OR own IS NOT NULL) AND (SELECT count(*) FROM past)=50 THEN (SELECT jsonb_build_object('at',starts_at,'id',id) FROM past ORDER BY starts_at,id LIMIT 1) ELSE NULL END,
 'credits',coalesce((SELECT jsonb_object_agg(course_id,jsonb_build_object('private',live_credit_allowance(id,'private'),'group',live_credit_allowance(id,'group'))) FROM enrollments WHERE user_id=actor AND status='active'),'{}'),
 'ownTeacherId',own,
 'teachers',coalesce((SELECT jsonb_agg(CASE WHEN admin OR t.user_id=actor THEN t.profile || jsonb_build_object('revision',t.revision,'userId',t.user_id,'invitedAt',t.invited_at)
 ELSE (t.profile - 'email' - 'groups' - 'availabilityNotes') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id WHERE b.teacher_id=t.id AND b.user_id=actor AND e.status IN ('active','completed')) OR ((t.user_id IS NULL OR EXISTS(SELECT 1 FROM users account WHERE account.id=t.user_id AND account.status='active')) AND t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
 'settings',(SELECT jsonb_object_agg(program,to_jsonb(s)||jsonb_build_object('display_price',(SELECT string_agg(DISTINCT (c.pricing->>'currency')||' '||(c.pricing->>'price'),' / ') FROM courses c WHERE live_course_program(c.id)=s.program AND c.is_published))) FROM live_program_settings s),
 'selections',coalesce((SELECT jsonb_object_agg(course_id,teacher_id) FROM live_teacher_selections WHERE user_id=actor),'{}'::jsonb),
 'bookings',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'id',b.id,'userId',b.user_id,'teacherId',b.teacher_id,'courseId',b.course_id,'program',b.program,'date',to_char(b.starts_at AT TIME ZONE b.timezone,'YYYY-MM-DD'),'start',to_char(b.starts_at AT TIME ZONE b.timezone,'HH24:MI'),'startsAt',b.starts_at,'endsAt',b.ends_at,'timezone',b.timezone,'kind',b.kind,'groupId',b.group_id,'title',b.title,'status',b.status,'creditUsed',b.credit_used,'studentName',u.name,
   'zoom',CASE WHEN admin OR b.teacher_id IS NOT DISTINCT FROM own OR b.status='booked' THEN b.zoom ELSE '' END,
   'recording',CASE WHEN admin OR b.teacher_id IS NOT DISTINCT FROM own OR (b.status IN ('booked','completed','no_show') AND b.ends_at<=now() AND (b.kind='group' OR b.status<>'no_show') AND (ct.course_ends_at IS NULL OR ct.course_ends_at>now())) THEN b.recording ELSE '' END,
   'canApprove',admin AND b.status='pending' AND b.starts_at>now(),
   'canReject',admin AND b.status='pending',
   'canReschedule',b.user_id=actor AND b.status IN ('pending','booked') AND s.cancellation_hours IS NOT NULL AND b.starts_at>=now()+make_interval(hours=>s.cancellation_hours),
   'cancelReturnsCredit',(admin OR b.teacher_id IS NOT DISTINCT FROM own OR b.starts_at>=now()+make_interval(hours=>s.credit_return_hours)),
   'rescheduleReturnsCredit',b.starts_at>=now()+make_interval(hours=>s.credit_return_hours),
   'cancellationReason',b.cancellation_reason,'rescheduledFrom',b.rescheduled_from,
   'courseEndsAt',ct.course_ends_at,'downloadsUntil',ct.downloads_until,
   'canCancel',b.status IN ('pending','booked') AND (admin OR b.teacher_id IS NOT DISTINCT FROM own OR (s.cancellation_hours IS NOT NULL AND b.starts_at>=now()+make_interval(hours=>s.cancellation_hours)))
 ) ORDER BY b.starts_at) FROM chosen b JOIN live_program_settings s ON s.program=b.program JOIN users u ON u.id=b.user_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id WHERE admin OR b.teacher_id IS NOT DISTINCT FROM own OR (b.user_id=actor AND EXISTS(SELECT 1 FROM enrollments e WHERE e.id=b.enrollment_id AND (e.status='active' OR (e.status='completed' AND (ct.downloads_until IS NULL OR ct.downloads_until>now())))))),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION managed_video_allowed(p_id uuid,p_manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND EXISTS(SELECT 1 FROM managed_videos v WHERE v.id=p_id AND (
 (v.kind='introduction' AND (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers t WHERE t.id=v.teacher_id AND t.user_id=auth.uid()))) OR
 (v.kind='lesson' AND is_admin_or_editor()) OR
 (NOT p_manage AND v.state='ready' AND ((v.kind='lesson' AND EXISTS(SELECT 1 FROM enrollments WHERE user_id=auth.uid() AND course_id=v.course_id AND status IN ('active','completed'))) OR (v.kind='introduction' AND EXISTS(SELECT 1 FROM live_teachers t JOIN enrollments e ON t.profile->'programs' ? live_course_program(e.course_id) WHERE t.id=v.teacher_id AND t.profile->>'status'='active' AND (t.user_id IS NULL OR EXISTS(SELECT 1 FROM users account WHERE account.id=t.user_id AND account.status='active')) AND e.user_id=auth.uid() AND e.status='active'))))));
$$;
CREATE OR REPLACE FUNCTION public.queue_live_booking_notification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE event_name text; recipient text; snapshot jsonb;
BEGIN
 IF TG_OP='INSERT' THEN event_name:='requested';
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN event_name:=CASE NEW.status WHEN 'booked' THEN 'confirmed' WHEN 'cancelled' THEN coalesce(NEW.cancellation_reason,'cancelled') ELSE NULL END;
 ELSIF NEW.zoom IS DISTINCT FROM OLD.zoom AND NEW.status='booked' AND NEW.starts_at>now() THEN event_name:='meeting_updated';
 END IF;
 IF event_name IS NULL THEN RETURN NEW; END IF;
 snapshot:=jsonb_build_object('title',NEW.title,'startsAt',NEW.starts_at,'timezone',NEW.timezone,'status',NEW.status,'creditUsed',NEW.credit_used,'teacher',(SELECT profile->>'name' FROM live_teachers WHERE id=NEW.teacher_id),'student',(SELECT name FROM users WHERE id=NEW.user_id));
 FOREACH recipient IN ARRAY CASE WHEN event_name='requested' THEN ARRAY['student','teacher','admin'] ELSE ARRAY['student','teacher'] END LOOP
  IF recipient='teacher' AND NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=NEW.teacher_id AND nullif(trim(email),'') IS NOT NULL) THEN CONTINUE; END IF;
  INSERT INTO live_booking_notifications(booking_id,event,audience,payload) VALUES(NEW.id,event_name,recipient,snapshot);
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.prepare_live_booking_notifications() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Unapproved requests never become no-shows and must not hold credits forever.
 UPDATE live_bookings SET status='cancelled',credit_used=false,cancellation_reason='expired',updated_at=now() WHERE status='pending' AND starts_at<=now();
 INSERT INTO live_booking_notifications(booking_id,event,audience,payload)
 SELECT b.id,'reminder',recipient,jsonb_build_object('title',b.title,'startsAt',b.starts_at,'timezone',b.timezone,'status',b.status,'creditUsed',b.credit_used,'teacher',t.profile->>'name','student',u.name)
 FROM live_bookings b JOIN live_teachers t ON t.id=b.teacher_id JOIN users u ON u.id=b.user_id
 CROSS JOIN unnest(ARRAY['student','teacher']) recipient
 WHERE (recipient<>'teacher' OR nullif(trim(t.email),'') IS NOT NULL) AND b.status='booked' AND b.starts_at>now() AND b.starts_at<=now()+interval '24 hours'
 ON CONFLICT(booking_id,audience) WHERE event='reminder' DO NOTHING;
END $$;

-- Make only the three requested profiles available, preserving their schedules and biographies.
UPDATE public.live_teachers
SET profile=jsonb_set(profile,'{status}','"active"'),revision=revision+1,updated_at=now()
WHERE id IN ('7f728974-cd84-4dd3-9643-f5f532df2b01','7f728974-cd84-4dd3-9643-f5f532df2b02','7f728974-cd84-4dd3-9643-f5f532df2b03')
 AND profile->>'status'='draft';

-- Remove the exact old, unlinked demo profile and its unpaid admin-only test data.
-- Refuse to delete actual student history, purchases, linked logins, or media.
DO $$DECLARE demo uuid:='47bd75fc-a2fe-4c75-b33f-229506a414bd'; uid uuid; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(demo::text,1));
 IF NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=demo) THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM live_teachers WHERE id=demo AND profile->>'name'='Ana — DEMO' AND user_id IS NULL) THEN RAISE EXCEPTION 'Demo identity changed; cleanup refused.'; END IF;
 FOR uid IN SELECT DISTINCT user_id FROM live_bookings WHERE teacher_id=demo ORDER BY user_id LOOP PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,2)); END LOOP;
 IF EXISTS(SELECT 1 FROM live_bookings b JOIN users u ON u.id=b.user_id WHERE b.teacher_id=demo AND (u.role NOT IN ('admin','editor') OR b.starts_at>now() OR EXISTS(SELECT 1 FROM purchases p WHERE p.user_id=b.user_id AND p.course_id=b.course_id AND p.status IN ('completed','refunded')))) THEN RAISE EXCEPTION 'Demo has student or paid lesson history; cleanup refused.'; END IF;
 IF EXISTS(SELECT 1 FROM live_assets WHERE teacher_id=demo) OR EXISTS(SELECT 1 FROM managed_videos WHERE teacher_id=demo) OR EXISTS(SELECT 1 FROM courses WHERE instructor->>'teacherId'=demo::text) OR EXISTS(SELECT 1 FROM live_bookings b JOIN live_bookings original ON original.id=b.rescheduled_from WHERE original.teacher_id=demo AND b.teacher_id<>demo) THEN RAISE EXCEPTION 'Demo has linked media, courses or replacement lessons; cleanup refused.'; END IF;
 DELETE FROM live_booking_notifications WHERE booking_id IN (SELECT id FROM live_bookings WHERE teacher_id=demo);
 DELETE FROM live_bookings WHERE teacher_id=demo;
 DELETE FROM live_teacher_selections WHERE teacher_id=demo;
 DELETE FROM live_group_sessions WHERE teacher_id=demo;
 DELETE FROM live_teachers WHERE id=demo;
END $$;
COMMIT;
