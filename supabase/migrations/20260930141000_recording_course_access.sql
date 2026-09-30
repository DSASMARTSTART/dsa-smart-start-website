BEGIN;
CREATE FUNCTION public.live_recording_access(p_id uuid,p_download boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND EXISTS(
 SELECT 1 FROM live_assets a WHERE a.id=p_id AND a.kind='recording' AND a.state IN ('ready','processing') AND (
 live_asset_manage(a.id) OR EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id
 WHERE b.user_id=auth.uid() AND e.status IN ('active','completed') AND b.status IN ('booked','completed','no_show') AND b.ends_at<=now()
 AND (b.kind='group' OR b.status<>'no_show') AND b.teacher_id=a.teacher_id
 AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id))
 AND CASE WHEN p_download THEN ct.downloads_until>now()
 ELSE coalesce(ct.course_ends_at,b.recording_expires_at)>now() AND e.status='active' END)));
$$;
CREATE OR REPLACE FUNCTION public.live_asset_read(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND
 EXISTS(SELECT 1 FROM live_assets a WHERE a.id=p_id AND (a.state IN ('ready','processing') OR (a.state IN ('uploading','error') AND live_asset_manage(a.id))) AND (
 live_asset_manage(a.id) OR (a.kind='material' AND live_material_access(a.course_id)) OR live_recording_access(a.id,false)));
$$;
CREATE FUNCTION public.live_recording_download_info(p_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT coalesce(live_recording_access(p_id,true),false) THEN RAISE EXCEPTION 'Recording download access has expired or is not configured for this course.'; END IF;
 RETURN (SELECT to_jsonb(a) FROM live_assets a WHERE id=p_id AND state='ready');
END $$;
CREATE OR REPLACE FUNCTION public.live_library(p_course uuid DEFAULT NULL,p_booking uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user();
BEGIN
 RETURN jsonb_build_object(
 'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'program',live_course_program(c.id),'materialsIncluded',c.teaching_materials_included,'materialsOffered',coalesce(c.teaching_materials_price,0)>0,'canReadMaterials',live_material_access(c.id)) ORDER BY c.title)
 FROM courses c WHERE live_course_program(c.id) IS NOT NULL AND (p_course IS NULL OR c.id=p_course) AND (live_is_admin() OR EXISTS(SELECT 1 FROM enrollments e LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE e.course_id=c.id AND e.user_id=actor AND (e.status='active' OR (e.status='completed' AND ct.downloads_until>now()))))),'[]'::jsonb),
 'assets',coalesce((SELECT jsonb_agg((to_jsonb(a)-'uploaded_by') || jsonb_build_object('canPlay',live_asset_read(a.id),'canDownload',a.kind='recording' AND live_recording_access(a.id,true),
 'downloadsUntil',(SELECT max(ct.downloads_until) FROM live_bookings b JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id JOIN enrollments e ON e.id=b.enrollment_id WHERE b.user_id=actor AND e.status IN ('active','completed') AND b.status IN ('booked','completed','no_show') AND b.teacher_id=a.teacher_id AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id)))) ORDER BY a.created_at DESC)
 FROM live_assets a WHERE (live_asset_read(a.id) OR live_recording_access(a.id,true))
 AND (p_course IS NULL OR a.course_id=p_course OR (a.kind='recording' AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.course_id=p_course AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id AND b.user_id=actor)))
 AND (p_booking IS NULL OR a.booking_id=p_booking OR (a.kind='recording' AND a.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.id=p_booking AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id)))),'[]'::jsonb));
END $$;
CREATE FUNCTION public.live_enrollment_terms() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'student',u.name,'course',c.title,'status',e.status,'courseEndsAt',ct.course_ends_at,'downloadsUntil',ct.downloads_until) ORDER BY u.name,c.title),'[]')
 FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE live_course_program(c.id) IS NOT NULL AND e.status IN ('active','completed'));
END $$;
CREATE FUNCTION public.save_live_course_terms(p_enrollment uuid,p_end timestamptz,p_download_until timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended((SELECT user_id::text FROM enrollments WHERE id=p_enrollment),2));
 IF NOT EXISTS(SELECT 1 FROM enrollments WHERE id=p_enrollment AND live_course_program(course_id) IS NOT NULL) THEN RAISE EXCEPTION 'Choose a live enrollment.'; END IF;
 IF p_end IS NULL OR p_download_until IS NULL OR p_download_until<p_end THEN RAISE EXCEPTION 'Set a course end and a download deadline on or after it.'; END IF;
 IF EXISTS(SELECT 1 FROM live_bookings WHERE enrollment_id=p_enrollment AND status IN ('pending','booked') AND ends_at>now() AND ends_at>p_end) THEN RAISE EXCEPTION 'The end date would exclude a scheduled lesson. Resolve those reservations first.'; END IF;
 INSERT INTO live_course_terms(enrollment_id,course_ends_at,downloads_until) VALUES(p_enrollment,p_end,p_download_until)
 ON CONFLICT(enrollment_id) DO UPDATE SET course_ends_at=excluded.course_ends_at,downloads_until=excluded.downloads_until,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.live_recording_access(uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.live_recording_download_info(uuid),public.live_enrollment_terms(),public.save_live_course_terms(uuid,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_recording_download_info(uuid),public.live_enrollment_terms(),public.save_live_course_terms(uuid,timestamptz,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.prepare_live_asset(p_kind text,p_course uuid,p_booking uuid,p_title text,p_filename text,p_mime text,p_bytes bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); b live_bookings; a live_assets; v_course uuid; v_bucket text; ext text;
BEGIN
 IF p_kind='material' THEN
  IF NOT live_is_admin() THEN RAISE EXCEPTION 'Only administrators can upload package materials.'; END IF;
  IF live_course_program(p_course) IS NULL THEN RAISE EXCEPTION 'Choose an existing live program.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM courses WHERE id=p_course AND (teaching_materials_included OR teaching_materials_price>0)) THEN RAISE EXCEPTION 'This package does not include or offer teaching materials.'; END IF;
  v_course:=p_course; v_bucket:='live-materials';
 ELSIF p_kind='recording' THEN
  SELECT * INTO b FROM live_bookings WHERE id=p_booking;
  IF b.id IS NULL OR NOT (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers WHERE id=b.teacher_id AND user_id=actor)) THEN RAISE EXCEPTION 'Only this teacher or an administrator can upload the recording.'; END IF;
  IF b.ends_at>now() OR b.status NOT IN ('booked','completed','no_show') OR (b.kind='private' AND b.status='no_show') THEN RAISE EXCEPTION 'Recordings can be added only after a confirmed, non-cancelled lesson ends.'; END IF;
  v_course:=b.course_id; v_bucket:=NULL;
 ELSE RAISE EXCEPTION 'Invalid file type.';
 END IF;
 IF p_bytes IS NULL OR p_bytes<=0 OR p_bytes>(CASE WHEN p_kind='recording' THEN 5368709120 ELSE 52428800 END) THEN RAISE EXCEPTION 'The file is empty or exceeds the upload limit.'; END IF;
 IF p_mime IS NULL OR NOT (p_mime=ANY(CASE WHEN p_kind='recording' THEN ARRAY['video/mp4','video/webm','video/quicktime'] ELSE (SELECT allowed_mime_types FROM storage.buckets WHERE id=v_bucket) END)) THEN RAISE EXCEPTION 'Unsupported file format.'; END IF;
 IF coalesce(length(trim(p_title)),0) NOT BETWEEN 1 AND 200 OR coalesce(length(p_filename),0) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Enter a title and a valid filename.'; END IF;
 ext:=CASE p_mime WHEN 'video/mp4' THEN 'mp4' WHEN 'video/webm' THEN 'webm' WHEN 'application/pdf' THEN 'pdf'
 WHEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' THEN 'docx'
 WHEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation' THEN 'pptx'
 WHEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' THEN 'xlsx'
 WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp'
 WHEN 'audio/mpeg' THEN 'mp3' WHEN 'audio/mp4' THEN 'm4a' WHEN 'audio/wav' THEN 'wav' ELSE 'txt' END;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,3));
 IF (SELECT count(*) FROM live_assets WHERE uploaded_by=actor AND state='uploading' AND created_at>now()-interval '24 hours')>=20 THEN RAISE EXCEPTION 'Finish or remove unfinished uploads before starting another.'; END IF;
 a.id:=gen_random_uuid();
 INSERT INTO live_assets(id,kind,course_id,booking_id,teacher_id,group_id,title,filename,mime_type,byte_size,provider,bucket,path,uploaded_by)
 VALUES(a.id,p_kind,v_course,b.id,b.teacher_id,b.group_id,trim(p_title),p_filename,p_mime,p_bytes,CASE WHEN p_kind='recording' THEN 'vimeo' ELSE 'storage' END,v_bucket,CASE WHEN p_kind='material' THEN a.id::text||'/file.'||ext ELSE NULL END,actor) RETURNING * INTO a;
 RETURN to_jsonb(a);
END $$;
COMMIT;
