BEGIN;
-- Missing or null dates mean ongoing access while the account is active and the
-- purchased enrollment is not revoked. Staff can still set explicit deadlines.
ALTER TABLE live_course_terms ALTER COLUMN course_ends_at DROP NOT NULL,
 ALTER COLUMN downloads_until DROP NOT NULL;
ALTER TABLE live_course_terms ADD CONSTRAINT live_course_terms_access_policy CHECK (
 (course_ends_at IS NULL AND downloads_until IS NULL) OR
 (course_ends_at IS NOT NULL AND downloads_until IS NOT NULL AND
  isfinite(course_ends_at) AND isfinite(downloads_until) AND downloads_until>=course_ends_at));
CREATE OR REPLACE FUNCTION public.live_recording_access(p_id uuid,p_download boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND EXISTS(
 SELECT 1 FROM live_assets a WHERE a.id=p_id AND a.kind='recording' AND a.state IN ('ready','processing') AND (
 live_asset_manage(a.id) OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id
 WHERE b.user_id=auth.uid() AND e.status IN ('active','completed') AND b.status IN ('booked','completed','no_show') AND b.ends_at<=now()
 AND (b.kind='group' OR b.status<>'no_show') AND b.teacher_id=a.teacher_id
 AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id))
 AND CASE WHEN p_download THEN (ct.downloads_until IS NULL OR ct.downloads_until>now())
 ELSE (ct.course_ends_at IS NULL OR ct.course_ends_at>now()) END)));
$$;

CREATE OR REPLACE FUNCTION public.save_live_course_terms(p_enrollment uuid,p_end timestamptz,p_download_until timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended((SELECT user_id::text FROM enrollments WHERE id=p_enrollment),2));
 IF NOT EXISTS(SELECT 1 FROM enrollments WHERE id=p_enrollment AND live_course_program(course_id) IS NOT NULL) THEN RAISE EXCEPTION 'Choose a live enrollment.'; END IF;
 IF (p_end IS NULL)<>(p_download_until IS NULL) OR p_download_until<p_end OR NOT isfinite(p_end) OR NOT isfinite(p_download_until) THEN RAISE EXCEPTION 'Choose ongoing access, or set a course end and a download deadline on or after it.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings WHERE enrollment_id=p_enrollment AND status IN ('pending','booked') AND ends_at>now() AND ends_at>p_end) THEN RAISE EXCEPTION 'The end date would exclude a scheduled lesson. Resolve those reservations first.'; END IF;
 INSERT INTO live_course_terms(enrollment_id,course_ends_at,downloads_until) VALUES(p_enrollment,p_end,p_download_until)
 ON CONFLICT(enrollment_id) DO UPDATE SET course_ends_at=excluded.course_ends_at,downloads_until=excluded.downloads_until,updated_at=now();
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
  IF EXISTS(SELECT 1 FROM live_course_terms WHERE enrollment_id=b.enrollment_id AND course_ends_at<b.ends_at) THEN RAISE EXCEPTION 'This lesson ends after the student’s course access deadline.'; END IF;
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

CREATE OR REPLACE FUNCTION public.live_library(p_course uuid DEFAULT NULL,p_booking uuid DEFAULT NULL,p_bookings uuid[] DEFAULT NULL,p_kind text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user();
BEGIN
 RETURN jsonb_build_object(
 'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'program',live_course_program(c.id),'materialsIncluded',c.teaching_materials_included,'materialsOffered',coalesce(c.teaching_materials_price,0)>0,'canReadMaterials',live_material_access(c.id)) ORDER BY c.title)
 FROM courses c WHERE live_course_program(c.id) IS NOT NULL AND (p_course IS NULL OR c.id=p_course) AND (live_is_admin() OR EXISTS(SELECT 1 FROM enrollments e LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE e.course_id=c.id AND e.user_id=actor AND (e.status='active' OR (e.status='completed' AND (ct.downloads_until IS NULL OR ct.downloads_until>now())))))),'[]'::jsonb),
 'assets',coalesce((SELECT jsonb_agg((to_jsonb(a)-'uploaded_by') || jsonb_build_object('canPlay',live_asset_read(a.id),'canDownload',a.kind='recording' AND live_recording_access(a.id,true),
 'downloadsUntil',(SELECT CASE WHEN bool_or(ct.downloads_until IS NULL) THEN NULL ELSE max(ct.downloads_until) END FROM live_bookings b LEFT JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id JOIN enrollments e ON e.id=b.enrollment_id WHERE b.user_id=actor AND e.status IN ('active','completed') AND b.status IN ('booked','completed','no_show') AND b.teacher_id=a.teacher_id AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id)))) ORDER BY a.created_at DESC)
 FROM live_assets a WHERE (p_kind IS NULL OR a.kind=p_kind) AND (p_bookings IS NULL OR a.kind='material' OR a.booking_id=ANY(p_bookings) OR EXISTS(SELECT 1 FROM live_bookings related WHERE related.id=ANY(p_bookings) AND related.group_id=a.group_id AND related.teacher_id=a.teacher_id)) AND (live_asset_read(a.id) OR live_recording_access(a.id,true))
 AND (p_course IS NULL OR a.course_id=p_course OR (a.kind='recording' AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.course_id=p_course AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id AND b.user_id=actor)))
 AND (p_booking IS NULL OR a.booking_id=p_booking OR (a.kind='recording' AND a.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.id=p_booking AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id)))),'[]'::jsonb));
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
 ELSE (t.profile - 'email' - 'groups') || jsonb_build_object('email','','groups',coalesce((SELECT jsonb_agg(g-'zoom'-'recording') FROM jsonb_array_elements(t.profile->'groups') g),'[]'::jsonb)) END ORDER BY t.profile->>'name') FROM live_teachers t WHERE admin OR t.user_id=actor OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id WHERE b.teacher_id=t.id AND b.user_id=actor AND e.status IN ('active','completed')) OR (t.user_id IS NOT NULL AND t.profile->>'status'='active' AND EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=actor AND e.status='active' AND t.profile->'programs' ? live_course_program(e.course_id)))),'[]'::jsonb),
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

CREATE OR REPLACE FUNCTION protect_deleted_recording_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended((SELECT user_id::text FROM enrollments WHERE id=NEW.enrollment_id),2));
 IF (NEW.downloads_until IS NULL OR NEW.downloads_until>now()) AND (TG_OP='INSERT' OR (NEW.downloads_until IS NULL AND OLD.downloads_until IS NOT NULL) OR NEW.downloads_until>OLD.downloads_until OR NEW.course_ends_at>OLD.course_ends_at) AND EXISTS(SELECT 1 FROM live_bookings b JOIN live_assets a ON a.teacher_id=b.teacher_id AND (a.booking_id=b.id OR a.group_id=b.group_id) JOIN live_vimeo_uploads v ON v.asset_id=a.id WHERE b.enrollment_id=NEW.enrollment_id AND (v.delete_pending OR v.deleted_at IS NOT NULL)) THEN RAISE EXCEPTION 'A recording for this enrollment is queued for deletion or was deleted. Its recording access cannot be extended.'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION managed_video_allowed(p_id uuid,p_manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND EXISTS(SELECT 1 FROM managed_videos v WHERE v.id=p_id AND (
 (v.kind='introduction' AND (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers t WHERE t.id=v.teacher_id AND t.user_id=auth.uid()))) OR
 (v.kind='lesson' AND is_admin_or_editor()) OR
 (NOT p_manage AND v.state='ready' AND ((v.kind='lesson' AND EXISTS(SELECT 1 FROM enrollments WHERE user_id=auth.uid() AND course_id=v.course_id AND status IN ('active','completed'))) OR (v.kind='introduction' AND EXISTS(SELECT 1 FROM live_teachers t JOIN enrollments e ON t.profile->'programs' ? live_course_program(e.course_id) WHERE t.id=v.teacher_id AND t.profile->>'status'='active' AND t.user_id IS NOT NULL AND e.user_id=auth.uid() AND e.status='active'))))));
$$;
COMMIT;
