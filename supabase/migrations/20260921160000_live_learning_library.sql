BEGIN;

-- Lesson videos are uploaded to Vimeo. Supabase stores only protected materials
-- and the metadata that connects Vimeo recordings to authorized bookings.

-- Private package materials and lesson recordings. A recording belongs to a
-- booked lesson, never just to a program where unrelated students could see it.
CREATE TABLE public.live_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('material','recording')),
 course_id uuid NOT NULL REFERENCES public.courses(id),
 booking_id uuid REFERENCES public.live_bookings(id),
 teacher_id uuid REFERENCES public.live_teachers(id),
 group_id uuid,
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
 filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
 mime_type text NOT NULL,
 byte_size bigint NOT NULL CHECK (byte_size > 0),
 provider text NOT NULL CHECK (provider IN ('storage','vimeo')),
 bucket text CHECK (bucket='live-materials'),
 path text UNIQUE,
 state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','processing','ready','error','removed')),
 uploaded_by uuid NOT NULL REFERENCES public.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 CHECK ((kind='material' AND booking_id IS NULL AND teacher_id IS NULL AND group_id IS NULL AND provider='storage' AND bucket='live-materials' AND path IS NOT NULL) OR
        (kind='recording' AND booking_id IS NOT NULL AND teacher_id IS NOT NULL AND provider='vimeo' AND bucket IS NULL AND path IS NULL))
);
-- Upload URLs and Vimeo API metadata must never be returned by the directory RPC.
CREATE TABLE public.live_vimeo_uploads (
 asset_id uuid PRIMARY KEY REFERENCES public.live_assets(id),
 video_uri text NOT NULL UNIQUE CHECK(video_uri ~ '^/videos/[0-9]+$'),
 upload_url text,
 embed_url text,
 last_checked_at timestamptz,
 error text
);
ALTER TABLE public.live_vimeo_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_vimeo_uploads FROM anon,authenticated;
GRANT ALL ON public.live_vimeo_uploads TO service_role;
CREATE INDEX live_assets_course ON public.live_assets(course_id) WHERE state='ready';
CREATE INDEX live_assets_booking ON public.live_assets(booking_id,group_id) WHERE state='ready';
ALTER TABLE public.live_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_assets FROM anon,authenticated;
GRANT ALL ON public.live_assets TO service_role;

CREATE FUNCTION public.live_material_access(p_course uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND
 EXISTS(SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id
 WHERE e.user_id=auth.uid() AND e.course_id=p_course AND e.status='active'
 AND live_course_program(c.id) IS NOT NULL AND (
 c.teaching_materials_included OR EXISTS(SELECT 1 FROM purchases p WHERE p.user_id=auth.uid()
 AND p.course_id=p_course AND p.status='completed' AND (p.include_teaching_materials OR p.teaching_materials_included))));
$$;

CREATE FUNCTION public.live_asset_manage(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND
 EXISTS(SELECT 1 FROM live_assets a WHERE a.id=p_id AND
 (live_is_admin() OR (a.kind='recording' AND EXISTS(SELECT 1 FROM live_teachers t WHERE t.id=a.teacher_id AND t.user_id=auth.uid()))));
$$;

CREATE FUNCTION public.live_asset_read(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active') AND
 EXISTS(SELECT 1 FROM live_assets a WHERE a.id=p_id AND (a.state IN ('ready','processing') OR (a.state IN ('uploading','error') AND live_asset_manage(a.id))) AND (
 live_asset_manage(a.id) OR (a.kind='material' AND live_material_access(a.course_id)) OR
 (a.kind='recording' AND EXISTS(SELECT 1 FROM live_bookings b JOIN enrollments e ON e.id=b.enrollment_id
 WHERE b.user_id=auth.uid() AND e.status='active' AND b.status<>'cancelled' AND b.ends_at<=now()
 AND b.recording_expires_at>now() AND b.teacher_id=a.teacher_id
 AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id))))));
$$;

CREATE FUNCTION public.live_asset_storage_allowed(p_bucket text,p_path text,p_operation text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM live_assets a WHERE a.bucket=p_bucket AND a.path=p_path AND
 CASE p_operation
 WHEN 'read' THEN live_asset_read(a.id) OR (a.state='uploading' AND a.uploaded_by=auth.uid() AND live_asset_manage(a.id))
 WHEN 'insert' THEN a.state='uploading' AND a.created_at>now()-interval '24 hours' AND a.uploaded_by=auth.uid() AND live_asset_manage(a.id)
 WHEN 'delete' THEN live_asset_manage(a.id)
 ELSE false END);
$$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('live-materials','live-materials',false,52428800,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav','text/plain'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY "Live library private reads" ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='live-materials' AND live_asset_storage_allowed(bucket_id,name,'read'));
CREATE POLICY "Live library controlled uploads" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='live-materials' AND live_asset_storage_allowed(bucket_id,name,'insert'));
CREATE POLICY "Live library controlled removal" ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='live-materials' AND live_asset_storage_allowed(bucket_id,name,'delete'));

CREATE FUNCTION public.prepare_live_asset(p_kind text,p_course uuid,p_booking uuid,p_title text,p_filename text,p_mime text,p_bytes bigint)
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
  IF b.ends_at>now() OR b.status='cancelled' THEN RAISE EXCEPTION 'Recordings can be added after a non-cancelled lesson ends.'; END IF;
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

CREATE FUNCTION public.finish_live_asset(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a live_assets; meta jsonb;
BEGIN
 PERFORM live_require_user();
 SELECT * INTO a FROM live_assets WHERE id=p_id FOR UPDATE;
 IF NOT coalesce(live_asset_manage(p_id),false) OR a.uploaded_by<>auth.uid() OR a.state='removed' THEN RAISE EXCEPTION 'Upload not permitted.'; END IF;
 IF a.provider<>'storage' THEN RAISE EXCEPTION 'Vimeo must verify the recording before publication.'; END IF;
 SELECT metadata INTO meta FROM storage.objects WHERE bucket_id=a.bucket AND name=a.path;
 IF meta IS NULL OR (meta->>'size')::bigint IS DISTINCT FROM a.byte_size OR meta->>'mimetype' IS DISTINCT FROM a.mime_type THEN RAISE EXCEPTION 'Upload has not finished or the file does not match. Please retry.'; END IF;
 UPDATE live_assets SET state='ready',published_at=coalesce(published_at,now()) WHERE id=p_id;
END $$;

CREATE FUNCTION public.live_asset_info(p_id uuid,p_manage boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT coalesce(CASE WHEN p_manage THEN live_asset_manage(p_id) ELSE live_asset_read(p_id) END,false) THEN RAISE EXCEPTION 'This file is not available to this account.'; END IF;
 RETURN (SELECT to_jsonb(a) FROM live_assets a WHERE id=p_id);
END $$;

CREATE FUNCTION public.remove_live_asset(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM live_require_user();
 IF NOT coalesce(live_asset_manage(p_id),false) THEN RAISE EXCEPTION 'You cannot remove this file.'; END IF;
 UPDATE live_assets SET state='removed' WHERE id=p_id;
END $$;

CREATE FUNCTION public.live_library(p_course uuid DEFAULT NULL,p_booking uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user();
BEGIN
 RETURN jsonb_build_object(
 'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'program',live_course_program(c.id),'materialsIncluded',c.teaching_materials_included,'materialsOffered',coalesce(c.teaching_materials_price,0)>0,'canReadMaterials',live_material_access(c.id)) ORDER BY c.title)
 FROM courses c WHERE live_course_program(c.id) IS NOT NULL AND (p_course IS NULL OR c.id=p_course) AND (live_is_admin() OR EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id=c.id AND e.user_id=actor AND e.status='active'))),'[]'::jsonb),
 'assets',coalesce((SELECT jsonb_agg(to_jsonb(a)-'uploaded_by' ORDER BY a.created_at DESC) FROM live_assets a WHERE live_asset_read(a.id)
 AND (p_course IS NULL OR a.course_id=p_course OR (a.kind='recording' AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.course_id=p_course AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id AND b.user_id=actor)))
 AND (p_booking IS NULL OR a.booking_id=p_booking OR (a.kind='recording' AND a.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.id=p_booking AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id)))),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.live_material_access(uuid),public.live_asset_manage(uuid),public.live_asset_read(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.live_asset_storage_allowed(text,text,text),public.prepare_live_asset(text,uuid,uuid,text,text,text,bigint),public.finish_live_asset(uuid),public.remove_live_asset(uuid),public.live_library(uuid,uuid),public.live_asset_info(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.live_asset_storage_allowed(text,text,text),public.prepare_live_asset(text,uuid,uuid,text,text,text,bigint),public.finish_live_asset(uuid),public.remove_live_asset(uuid),public.live_library(uuid,uuid),public.live_asset_info(uuid,boolean) TO authenticated;
COMMIT;
