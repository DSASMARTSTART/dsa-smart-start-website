BEGIN;
DROP FUNCTION live_library(uuid,uuid);
CREATE OR REPLACE FUNCTION public.live_library(p_course uuid DEFAULT NULL,p_booking uuid DEFAULT NULL,p_bookings uuid[] DEFAULT NULL,p_kind text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=live_require_user();
BEGIN
 RETURN jsonb_build_object(
 'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'program',live_course_program(c.id),'materialsIncluded',c.teaching_materials_included,'materialsOffered',coalesce(c.teaching_materials_price,0)>0,'canReadMaterials',live_material_access(c.id)) ORDER BY c.title)
 FROM courses c WHERE live_course_program(c.id) IS NOT NULL AND (p_course IS NULL OR c.id=p_course) AND (live_is_admin() OR EXISTS(SELECT 1 FROM enrollments e LEFT JOIN live_course_terms ct ON ct.enrollment_id=e.id WHERE e.course_id=c.id AND e.user_id=actor AND (e.status='active' OR (e.status='completed' AND ct.downloads_until>now()))))),'[]'::jsonb),
 'assets',coalesce((SELECT jsonb_agg((to_jsonb(a)-'uploaded_by') || jsonb_build_object('canPlay',live_asset_read(a.id),'canDownload',a.kind='recording' AND live_recording_access(a.id,true),
 'downloadsUntil',(SELECT max(ct.downloads_until) FROM live_bookings b JOIN live_course_terms ct ON ct.enrollment_id=b.enrollment_id JOIN enrollments e ON e.id=b.enrollment_id WHERE b.user_id=actor AND e.status IN ('active','completed') AND b.status IN ('booked','completed','no_show') AND b.teacher_id=a.teacher_id AND (b.id=a.booking_id OR (a.group_id IS NOT NULL AND b.group_id=a.group_id)))) ORDER BY a.created_at DESC)
 FROM live_assets a WHERE (p_kind IS NULL OR a.kind=p_kind) AND (p_bookings IS NULL OR a.kind='material' OR a.booking_id=ANY(p_bookings) OR EXISTS(SELECT 1 FROM live_bookings related WHERE related.id=ANY(p_bookings) AND related.group_id=a.group_id AND related.teacher_id=a.teacher_id)) AND (live_asset_read(a.id) OR live_recording_access(a.id,true))
 AND (p_course IS NULL OR a.course_id=p_course OR (a.kind='recording' AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.course_id=p_course AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id AND b.user_id=actor)))
 AND (p_booking IS NULL OR a.booking_id=p_booking OR (a.kind='recording' AND a.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM live_bookings b WHERE b.id=p_booking AND b.group_id=a.group_id AND b.teacher_id=a.teacher_id)))),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION live_library(uuid,uuid,uuid[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION live_library(uuid,uuid,uuid[],text) TO authenticated;
COMMIT;
