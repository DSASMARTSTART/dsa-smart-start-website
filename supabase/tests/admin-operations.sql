BEGIN;
UPDATE users SET status='active' WHERE id='00000000-0000-4000-8000-000000000001';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$DECLARE e uuid; restored uuid; b uuid; moved uuid; tid uuid:='20000000-0000-4000-8000-000000000001'; c uuid:='10000000-0000-4000-8000-000000000001'; before_credits int; BEGIN
 SELECT id INTO e FROM enrollments WHERE user_id='00000000-0000-4000-8000-000000000003' AND course_id=c;
 UPDATE enrollments SET status='revoked' WHERE id=e;
 restored:=admin_grant_course('00000000-0000-4000-8000-000000000003',c,'support restoration');
 PERFORM test_assert(restored=e,'restoring access preserves enrollment identity');
 PERFORM adjust_live_credits(e,'private',3,'extra lessons');
 PERFORM test_assert(live_credit_allowance(e,'private')=8,'auditable extra credits');
 b:=staff_live_booking(e,tid,current_date+100,'10:00',NULL,NULL,'staff request');
 PERFORM test_assert((SELECT status='pending' AND user_id='00000000-0000-4000-8000-000000000003' FROM live_bookings WHERE id=b),'staff creates pending request for student');
 PERFORM test_reject(format('SELECT staff_live_booking(%L,%L,current_date+100,''02:00'',NULL,%L,''failed move'')',e,tid,b),'no longer available');
 PERFORM test_assert((SELECT status='pending' AND credit_used FROM live_bookings WHERE id=b),'failed reschedule rolls back cancellation');
 moved:=staff_live_booking(e,tid,current_date+101,'11:00',NULL,b,'teacher change');
 PERFORM test_assert((SELECT status='cancelled' AND NOT credit_used FROM live_bookings WHERE id=b),'staff reschedule refunds original');
 PERFORM test_assert((SELECT rescheduled_from=b FROM live_bookings WHERE id=moved),'replacement keeps trace');
 PERFORM test_reject(format('SELECT adjust_live_credits(%L,''private'',-100,''invalid removal'')',e),'already used');
 PERFORM test_assert(EXISTS(SELECT 1 FROM audit_logs WHERE entity_type='credit'),'credit changes audited');
 -- A second teacher can replace the original at the same time.
 PERFORM save_live_teacher((SELECT profile||jsonb_build_object('id','20000000-0000-4000-8000-000000000009','email','person8@example.invalid','groups','[]'::jsonb) FROM live_teachers WHERE id=tid));
 PERFORM test_assert(staff_live_availability(e,'20000000-0000-4000-8000-000000000009',current_date+101,moved)->'times' ? '11:00','availability excludes original student slot during reassignment');
 PERFORM staff_live_booking(e,'20000000-0000-4000-8000-000000000009',current_date+101,'11:00',NULL,moved,'substitute teacher');
END $$;
SELECT save_live_email_configuration('{"locale":"it","templates":{"requested":{"subject":"Richiesta ricevuta","body":"La lezione è in attesa di approvazione."}}}');
SELECT test_assert(live_email_configuration()->>'locale'='it','staff can configure booking email language');
SELECT test_reject($$SELECT save_live_email_configuration('{"locale":"it","templates":{"unknown":{"subject":"Subject","body":"Message"}}}')$$,'Use a subject');
SELECT test_assert(teacher_photo_is_unused('20000000-0000-4000-8000-000000000001','https://example.invalid/unused.jpg'),'unreferenced photo can be cleaned up');
UPDATE live_teachers SET profile=profile||'{"photo":"https://example.invalid/used.jpg"}' WHERE id='20000000-0000-4000-8000-000000000001';
SELECT test_assert(NOT teacher_photo_is_unused('20000000-0000-4000-8000-000000000001','https://example.invalid/used.jpg'),'committed photo survives an uncertain save response');
-- Reporting filters run before pagination and never mix currency totals.
INSERT INTO purchases(user_id,course_id,status,amount,currency,transaction_id) VALUES
('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','completed',100,'EUR','support-1'),
('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','completed',11700,'RSD','support-2');
SELECT test_assert((admin_transactions('{"search":"support-","currency":"EUR"}')->'stats'->>'totalRevenue')::numeric=100,'transactions isolate currency');
SELECT test_assert((admin_transactions('{"search":"Person person3","currency":"RSD"}')->>'count')::int=1,'search finds student');
UPDATE users SET role='secretary' WHERE id='00000000-0000-4000-8000-000000000008';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000008',false);
SELECT test_assert(jsonb_array_length(staff_live_enrollments())>0,'secretary sees active enrollments');
SELECT test_reject('SELECT admin_transactions()','administrator');
SELECT test_reject($$SELECT admin_grant_course('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001')$$,'administrator');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_reject('SELECT staff_live_enrollments()','staff');
SELECT test_reject('SELECT live_email_configuration()','staff');
SELECT test_assert((live_workspace()->'credits'->'10000000-0000-4000-8000-000000000001'->>'private')::int=8,'student receives adjusted credits');
SELECT test_reject($$SELECT prepare_managed_video('introduction','20000000-0000-4000-8000-000000000001',NULL,NULL,'Test','test.mp4',1024,'video/mp4')$$,'management');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$DECLARE v jsonb; vid uuid; BEGIN
 v:=prepare_managed_video('introduction','20000000-0000-4000-8000-000000000001',NULL,NULL,'Test','test.mp4',1024,'video/mp4'); vid:=(v->>'id')::uuid;
 UPDATE managed_videos SET state='ready',video_uri='/videos/123',embed_url='https://player.vimeo.com/video/123' WHERE managed_videos.id=vid;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
 PERFORM test_assert(managed_video_info(vid) IS NOT NULL,'enrolled student can watch eligible teacher intro');
 PERFORM test_assert(NOT (managed_video_info(vid) ? 'video_uri'),'private Vimeo metadata hidden');
 PERFORM test_reject(format('SELECT managed_video_info(%L,true)',vid),'unavailable');
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
UPDATE courses SET instructor='{"teacherId":"20000000-0000-4000-8000-000000000001","title":"Tutor"}' WHERE id='10000000-0000-4000-8000-000000000001';
SELECT test_assert((SELECT instructor->>'name'='Teacher Test' FROM courses WHERE id='10000000-0000-4000-8000-000000000001'),'linked teacher populated');
UPDATE live_teachers SET profile=profile||'{"bio":"Updated biography"}' WHERE id='20000000-0000-4000-8000-000000000001';
SELECT test_assert((SELECT instructor->>'bio'='Updated biography' FROM courses WHERE id='10000000-0000-4000-8000-000000000001'),'teacher changes propagate');
SELECT test_assert(admin_course_progress('10000000-0000-4000-8000-000000000001') IS NULL,'no content yields unknown progress');
-- Whole-group move preserves all attendee credits and creates pending replacements.
UPDATE live_bookings SET status='booked',credit_used=true WHERE group_id='30000000-0000-4000-8000-000000000001';
SELECT test_reject($$SELECT reschedule_live_group('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',current_date+70,'14:00','conflicting session')$$,'overlaps a private');
SELECT test_assert((SELECT count(*)=3 FROM live_bookings WHERE group_id='30000000-0000-4000-8000-000000000001' AND status='booked' AND credit_used),'failed group move preserves all reservations');
SELECT test_assert(reschedule_live_group('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',current_date+110,'12:00','teacher availability')=3,'whole group moved');
SELECT test_assert((SELECT count(*)=3 FROM live_bookings WHERE starts_at::date=current_date+110 AND status='pending'),'all group attendees moved');
-- A shared recording cannot be deleted while any attendee still has download access.
DO $$DECLARE asset uuid; booking uuid; e uuid; BEGIN
 SELECT id INTO booking FROM live_bookings WHERE starts_at::date=current_date+110 AND status='pending' LIMIT 1;
 UPDATE live_bookings SET starts_at=now()-interval '3 days',ends_at=now()-interval '3 days'+interval '50 minutes',status='completed' WHERE starts_at::date=current_date+110 AND status='pending';
 INSERT INTO live_course_terms(enrollment_id,course_ends_at,downloads_until) SELECT DISTINCT enrollment_id,now()-interval '1 day',CASE WHEN user_id='00000000-0000-4000-8000-000000000005' THEN now()+interval '1 day' ELSE now()-interval '1 hour' END FROM live_bookings WHERE group_id=(SELECT group_id FROM live_bookings WHERE id=booking) ON CONFLICT(enrollment_id) DO UPDATE SET course_ends_at=excluded.course_ends_at,downloads_until=excluded.downloads_until;
 asset:=(prepare_live_asset('recording',NULL,booking,'Shared recording','shared.mp4','video/mp4',1024)->>'id')::uuid;
 UPDATE live_assets SET state='ready' WHERE id=asset;
 INSERT INTO live_vimeo_uploads(asset_id,video_uri) VALUES(asset,'/videos/987654321');
 PERFORM test_assert(NOT live_recording_cleanup_eligible(asset),'last attendee protects shared recording');
 PERFORM test_reject(format('SELECT claim_live_recording_cleanup(%L)',asset),'may still need');
 UPDATE live_course_terms SET downloads_until=now()-interval '1 hour' WHERE enrollment_id=(SELECT enrollment_id FROM live_bookings WHERE group_id=(SELECT group_id FROM live_bookings WHERE id=booking) AND user_id='00000000-0000-4000-8000-000000000005');
 PERFORM test_assert(claim_live_recording_cleanup(asset)='/videos/987654321','expired recording can be claimed');
 SELECT enrollment_id INTO e FROM live_bookings WHERE id=booking;
 PERFORM test_reject(format('UPDATE live_course_terms SET downloads_until=now()+interval ''1 day'' WHERE enrollment_id=%L',e),'cannot be extended');
 PERFORM test_assert((live_storage_report()->>'recordingBytes')::bigint>=1024,'storage totals include claimed uploads until deleted');
END $$;
-- More than 50 historical bookings paginate without leaking private metadata.
INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,starts_at,ends_at,timezone,title,status,credit_used)
SELECT e.id,e.user_id,e.course_id,'20000000-0000-4000-8000-000000000001','hybrid-pack','private',now()-make_interval(days=>n),now()-make_interval(days=>n)+interval '30 minutes','Europe/Belgrade','History','completed',false FROM enrollments e,generate_series(1,60)n WHERE e.user_id='00000000-0000-4000-8000-000000000003' AND e.course_id='10000000-0000-4000-8000-000000000001';
DO $$DECLARE first jsonb; second jsonb; BEGIN
 first:=live_workspace();
 PERFORM test_assert(first->'historyCursor' IS NOT NULL AND first->'historyCursor'<>'null','history returns cursor');
 second:=live_workspace((first->'historyCursor'->>'at')::timestamptz,(first->'historyCursor'->>'id')::uuid);
 PERFORM test_assert(jsonb_array_length(second->'bookings')=least(50,(SELECT count(*)-50 FROM live_bookings WHERE starts_at<now())),'remaining history page');
 PERFORM test_assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(first->'bookings') a,jsonb_array_elements(second->'bookings') b WHERE a->>'id'=b->>'id'),'pages do not repeat bookings');
END $$;
ROLLBACK;
