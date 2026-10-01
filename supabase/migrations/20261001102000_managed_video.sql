BEGIN;
CREATE TABLE managed_videos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL CHECK(kind IN ('introduction','lesson')),teacher_id uuid REFERENCES live_teachers(id),course_id uuid REFERENCES courses(id),lesson_id text,title text NOT NULL,filename text NOT NULL,byte_size bigint NOT NULL CHECK(byte_size>0 AND byte_size<=5368709120),state text NOT NULL DEFAULT 'uploading' CHECK(state IN ('uploading','processing','ready','error','removed')),video_uri text UNIQUE,embed_url text,error text,created_at timestamptz NOT NULL DEFAULT now(),uploaded_by uuid NOT NULL REFERENCES users(id),delete_pending boolean NOT NULL DEFAULT false,CHECK((kind='introduction' AND teacher_id IS NOT NULL AND course_id IS NULL AND lesson_id IS NULL) OR (kind='lesson' AND teacher_id IS NULL AND course_id IS NOT NULL AND lesson_id IS NOT NULL)));
ALTER TABLE managed_videos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON managed_videos FROM PUBLIC,anon,authenticated;
GRANT ALL ON managed_videos TO service_role;
CREATE INDEX managed_videos_teacher ON managed_videos(teacher_id,created_at DESC);
CREATE INDEX managed_videos_course ON managed_videos(course_id,lesson_id);
CREATE FUNCTION managed_video_allowed(p_id uuid,p_manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND EXISTS(SELECT 1 FROM managed_videos v WHERE v.id=p_id AND (
 (v.kind='introduction' AND (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers t WHERE t.id=v.teacher_id AND t.user_id=auth.uid()))) OR
 (v.kind='lesson' AND is_admin_or_editor()) OR
 (NOT p_manage AND v.state='ready' AND ((v.kind='lesson' AND EXISTS(SELECT 1 FROM enrollments WHERE user_id=auth.uid() AND course_id=v.course_id AND status='active')) OR (v.kind='introduction' AND EXISTS(SELECT 1 FROM live_teachers t JOIN enrollments e ON t.profile->'programs' ? live_course_program(e.course_id) WHERE t.id=v.teacher_id AND t.profile->>'status'='active' AND t.user_id IS NOT NULL AND e.user_id=auth.uid() AND e.status='active'))))));
$$;
CREATE FUNCTION managed_video_info(p_id uuid,p_manage boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT coalesce(managed_video_allowed(p_id,p_manage),false) THEN RAISE EXCEPTION 'Video unavailable to this account.'; END IF;
 RETURN (SELECT to_jsonb(v)-'video_uri'-'embed_url'-'error' FROM managed_videos v WHERE id=p_id);
END $$;
CREATE FUNCTION managed_video_list(p_teacher uuid DEFAULT NULL,p_course uuid DEFAULT NULL,p_lesson text DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY created_at DESC),'[]') FROM (SELECT id,title,filename,byte_size,state,created_at,delete_pending FROM managed_videos WHERE (p_teacher IS NOT NULL AND teacher_id=p_teacher OR p_course IS NOT NULL AND course_id=p_course AND lesson_id=p_lesson) AND managed_video_allowed(id,false) AND (state<>'removed' OR delete_pending) ORDER BY created_at DESC LIMIT 20) x;
$$;
CREATE FUNCTION prepare_managed_video(p_kind text,p_teacher uuid,p_course uuid,p_lesson text,p_title text,p_filename text,p_bytes bigint,p_mime text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user(); v managed_videos;
BEGIN
 IF p_kind='introduction' THEN
  IF NOT (live_is_admin() OR EXISTS(SELECT 1 FROM live_teachers WHERE id=p_teacher AND user_id=actor)) THEN RAISE EXCEPTION 'Teacher management access required.'; END IF;
 ELSIF p_kind='lesson' THEN
  IF NOT is_admin_or_editor() OR NOT EXISTS(SELECT 1 FROM courses c,jsonb_array_elements(c.modules) m,jsonb_array_elements(coalesce(m->'lessons','[]')) l WHERE c.id=p_course AND l->>'id'=p_lesson) THEN RAISE EXCEPTION 'Save the course lesson before uploading a video.'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported video kind.';
 END IF;
 IF coalesce(length(trim(p_title)),0) NOT BETWEEN 1 AND 200 OR coalesce(length(p_filename),0) NOT BETWEEN 1 AND 255 OR p_mime NOT IN ('video/mp4','video/webm','video/quicktime') OR p_mime IS NULL THEN RAISE EXCEPTION 'Choose a titled MP4, MOV or WebM video.'; END IF;
 INSERT INTO managed_videos(kind,teacher_id,course_id,lesson_id,title,filename,byte_size,uploaded_by) VALUES(p_kind,p_teacher,p_course,p_lesson,trim(p_title),p_filename,p_bytes,actor) RETURNING * INTO v;
 RETURN to_jsonb(v)-'video_uri'-'embed_url'-'error';
END $$;
CREATE TRIGGER audit_live_asset AFTER INSERT OR UPDATE OR DELETE ON live_assets FOR EACH ROW EXECUTE FUNCTION admin_audit_change('asset');
CREATE TRIGGER audit_managed_video AFTER INSERT OR UPDATE OR DELETE ON managed_videos FOR EACH ROW EXECUTE FUNCTION admin_audit_change('asset');
REVOKE ALL ON FUNCTION managed_video_allowed(uuid,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION managed_video_info(uuid,boolean),managed_video_list(uuid,uuid,text),prepare_managed_video(text,uuid,uuid,text,text,text,bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION managed_video_info(uuid,boolean),managed_video_list(uuid,uuid,text),prepare_managed_video(text,uuid,uuid,text,text,text,bigint,text) TO authenticated;
-- Only recordings for which every relevant access deadline has passed qualify.
ALTER TABLE live_vimeo_uploads ADD COLUMN delete_pending boolean NOT NULL DEFAULT false, ADD COLUMN deleted_at timestamptz;
CREATE FUNCTION live_recording_cleanup_eligible(p_asset uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM live_assets a WHERE a.id=p_asset AND a.kind='recording' AND (
 (a.state IN ('uploading','error') AND a.created_at<now()-interval '2 days') OR
 (a.state IN ('ready','processing','removed') AND NOT EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE b.teacher_id=a.teacher_id AND (b.id=a.booking_id OR b.group_id=a.group_id) AND b.status IN ('pending','booked','completed','no_show') AND e.status IN ('active','completed') AND (ct.downloads_until IS NULL OR ct.downloads_until>now() OR ct.course_ends_at>now())))));
$$;
CREATE FUNCTION live_storage_report() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 RETURN jsonb_build_object('recordingBytes',(SELECT coalesce(sum(a.byte_size),0) FROM live_assets a JOIN live_vimeo_uploads v ON v.asset_id=a.id WHERE v.deleted_at IS NULL),'managedBytes',(SELECT coalesce(sum(byte_size),0) FROM managed_videos WHERE video_uri IS NOT NULL),'cleanup',coalesce((SELECT jsonb_agg(x) FROM (SELECT a.id,a.title,a.byte_size,a.created_at,v.delete_pending FROM live_assets a JOIN live_vimeo_uploads v ON v.asset_id=a.id WHERE v.deleted_at IS NULL AND live_recording_cleanup_eligible(a.id) ORDER BY a.created_at LIMIT 100) x),'[]'));
END $$;
REVOKE ALL ON FUNCTION live_recording_cleanup_eligible(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION live_recording_cleanup_eligible(uuid) TO service_role;
REVOKE ALL ON FUNCTION live_storage_report() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION live_storage_report() TO authenticated;
COMMIT;
