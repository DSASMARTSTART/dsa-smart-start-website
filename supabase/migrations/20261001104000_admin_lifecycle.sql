BEGIN;
-- Protect a successfully committed photo when a save response is lost in transit.
CREATE FUNCTION teacher_photo_is_unused(p_teacher uuid,p_url text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT live_teacher_media_allowed(p_teacher::text) THEN RAISE EXCEPTION 'Teacher media access required.'; END IF;
 IF coalesce(p_url,'')='' THEN RETURN false; END IF;
 RETURN NOT EXISTS(SELECT 1 FROM live_teachers WHERE profile->>'photo'=p_url) AND NOT EXISTS(SELECT 1 FROM courses c WHERE position(p_url in to_jsonb(c)::text)>0);
END $$;
REVOKE ALL ON FUNCTION teacher_photo_is_unused(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION teacher_photo_is_unused(uuid,text) TO authenticated;
-- Progress excludes courses with no trackable lessons; their value is unknown, not zero.
CREATE FUNCTION admin_course_progress(p_course uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result numeric;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active' AND role IN ('admin','editor')) THEN RAISE EXCEPTION 'Course staff access required.'; END IF;
 WITH items AS (SELECT item->>'id' id,kind FROM courses c CROSS JOIN LATERAL jsonb_array_elements(c.modules) m CROSS JOIN LATERAL (SELECT value item,'lesson' kind FROM jsonb_array_elements(coalesce(m->'lessons','[]')) UNION ALL SELECT value,'homework' FROM jsonb_array_elements(coalesce(m->'homework','[]'))) x WHERE c.id=p_course AND item->>'id' IS NOT NULL),
 scores AS (SELECT 100.0*(SELECT count(*) FROM items i WHERE EXISTS(SELECT 1 FROM progress p WHERE p.user_id=e.user_id AND p.course_id=e.course_id AND p.is_completed AND CASE WHEN i.kind='lesson' THEN p.lesson_id=i.id ELSE p.homework_id=i.id END))/nullif((SELECT count(*) FROM items),0) value FROM enrollments e WHERE e.course_id=p_course AND e.status IN ('active','completed'))
 SELECT round(avg(value),1) INTO result FROM scores;
 RETURN result;
END $$;
CREATE FUNCTION admin_teacher_options() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=auth.uid() AND status='active' AND role IN ('admin','editor')) THEN RAISE EXCEPTION 'Course staff access required.'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',profile->>'name','bio',profile->>'bio','photo',profile->>'photo') ORDER BY profile->>'name'),'[]') FROM live_teachers);
END $$;
CREATE FUNCTION sync_course_instructor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t live_teachers;
BEGIN
 IF nullif(NEW.instructor->>'teacherId','') IS NOT NULL THEN
 SELECT * INTO t FROM live_teachers WHERE id=(NEW.instructor->>'teacherId')::uuid;
 IF t.id IS NULL THEN RAISE EXCEPTION 'Linked teacher does not exist.'; END IF;
 NEW.instructor:=NEW.instructor||jsonb_build_object('name',t.profile->>'name','bio',t.profile->>'bio','avatarUrl',t.profile->>'photo');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER course_instructor BEFORE INSERT OR UPDATE OF instructor ON courses FOR EACH ROW EXECUTE FUNCTION sync_course_instructor();
CREATE FUNCTION propagate_teacher_instructor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.profile->>'name' IS DISTINCT FROM NEW.profile->>'name' OR OLD.profile->>'bio' IS DISTINCT FROM NEW.profile->>'bio' OR OLD.profile->>'photo' IS DISTINCT FROM NEW.profile->>'photo' THEN
 UPDATE courses SET instructor=instructor||jsonb_build_object('name',NEW.profile->>'name','bio',NEW.profile->>'bio','avatarUrl',NEW.profile->>'photo') WHERE instructor->>'teacherId'=NEW.id::text;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER teacher_instructor AFTER UPDATE ON live_teachers FOR EACH ROW EXECUTE FUNCTION propagate_teacher_instructor();
-- Claim deletion before the network operation. Enrollment dates are locked against
-- extension once any related video is queued or deleted, preventing a cleanup race.
CREATE FUNCTION claim_live_recording_cleanup(p_asset uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a live_assets; uid uuid; uri text;
BEGIN
 SELECT * INTO a FROM live_assets WHERE id=p_asset;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Recording not found.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.teacher_id::text,1));
 FOR uid IN SELECT DISTINCT b.user_id FROM live_bookings b WHERE b.teacher_id=a.teacher_id AND (b.id=a.booking_id OR b.group_id=a.group_id) ORDER BY b.user_id LOOP
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,2));
 END LOOP;
 IF NOT live_recording_cleanup_eligible(p_asset) THEN RAISE EXCEPTION 'A student may still need this recording; cleanup refused.'; END IF;
 UPDATE live_vimeo_uploads SET delete_pending=true WHERE asset_id=p_asset AND deleted_at IS NULL RETURNING video_uri INTO uri;
 RETURN uri;
END $$;
CREATE FUNCTION protect_deleted_recording_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended((SELECT user_id::text FROM enrollments WHERE id=NEW.enrollment_id),2));
 IF NEW.downloads_until>now() AND (TG_OP='INSERT' OR NEW.downloads_until>OLD.downloads_until OR NEW.course_ends_at>OLD.course_ends_at) AND EXISTS(SELECT 1 FROM live_bookings b JOIN live_assets a ON a.teacher_id=b.teacher_id AND (a.booking_id=b.id OR a.group_id=b.group_id) JOIN live_vimeo_uploads v ON v.asset_id=a.id WHERE b.enrollment_id=NEW.enrollment_id AND (v.delete_pending OR v.deleted_at IS NOT NULL)) THEN RAISE EXCEPTION 'A recording for this enrollment is queued for deletion or was deleted. Its recording access cannot be extended.'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_recording_terms BEFORE INSERT OR UPDATE ON live_course_terms FOR EACH ROW EXECUTE FUNCTION protect_deleted_recording_terms();
CREATE FUNCTION reschedule_live_group(p_teacher uuid,p_group uuid,p_date date,p_time text,p_reason text) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t live_teachers; g jsonb; doc jsonb; old_ids uuid[]; bid uuid; replacement uuid; b live_bookings; new_id uuid:=gen_random_uuid(); n int:=0; uid uuid;
BEGIN
 IF NOT live_is_admin() THEN RAISE EXCEPTION 'Booking staff access required.'; END IF;
 IF coalesce(length(trim(p_reason)),0) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Enter a rescheduling reason.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_teacher::text,1));
 SELECT * INTO t FROM live_teachers WHERE id=p_teacher FOR UPDATE;
 SELECT value INTO g FROM jsonb_array_elements(t.profile->'groups') WHERE value->>'id'=p_group::text;
 IF g IS NULL OR live_start((g->>'date')::date,g->>'start',t.profile->>'timezone')<=now() THEN RAISE EXCEPTION 'Choose a future group session.'; END IF;
 FOR uid IN SELECT DISTINCT user_id FROM live_bookings WHERE teacher_id=p_teacher AND group_id=p_group AND status IN ('pending','booked') ORDER BY user_id LOOP PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,2)); END LOOP;
 SELECT array_agg(id) INTO old_ids FROM live_bookings WHERE teacher_id=p_teacher AND group_id=p_group AND status IN ('pending','booked');
 UPDATE live_bookings SET status='cancelled',credit_used=false,cancellation_reason='group reschedule: '||p_reason,updated_at=now() WHERE id=ANY(old_ids);
 g:=g||jsonb_build_object('id',new_id,'date',p_date::text,'start',p_time,'recording','');
 doc:=t.profile||jsonb_build_object('revision',t.revision,'groups',coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(t.profile->'groups') x WHERE x->>'id'<>p_group::text),'[]')||jsonb_build_array(g));
 PERFORM save_live_teacher(doc);
 FOREACH bid IN ARRAY coalesce(old_ids,ARRAY[]::uuid[]) LOOP
 SELECT * INTO b FROM live_bookings WHERE id=bid;
 replacement:=book_live_lesson_for(b.course_id,p_teacher,p_date,NULL,new_id,b.user_id);
 UPDATE live_bookings SET rescheduled_from=bid WHERE id=replacement;
 n:=n+1;
 END LOOP;
 INSERT INTO audit_logs(action,entity_type,entity_id,admin_id,admin_name,description) SELECT 'booking_group_rescheduled','booking',new_id::text,id,name,p_reason FROM users WHERE id=auth.uid();
 RETURN n;
END $$;
-- Cancelled sessions should also leave the current/history calendar index.
CREATE FUNCTION prune_group_index() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 DELETE FROM live_group_sessions h WHERE h.teacher_id=NEW.id AND h.starts_at>now() AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.profile->'groups') g WHERE g->>'id'=h.id::text);
 RETURN NEW;
END $$;
CREATE TRIGGER prune_group_index AFTER UPDATE ON live_teachers FOR EACH ROW EXECUTE FUNCTION prune_group_index();
REVOKE ALL ON FUNCTION sync_course_instructor(),propagate_teacher_instructor(),protect_deleted_recording_terms(),prune_group_index() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION claim_live_recording_cleanup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_live_recording_cleanup(uuid) TO service_role;
REVOKE ALL ON FUNCTION admin_course_progress(uuid),admin_teacher_options(),reschedule_live_group(uuid,uuid,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION admin_course_progress(uuid),admin_teacher_options(),reschedule_live_group(uuid,uuid,date,text,text) TO authenticated;
COMMIT;
