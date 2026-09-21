\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
-- All four existing live product types remain usable; only configured materials are included.
INSERT INTO courses(id,title,level,product_type,content_format,teaching_materials_included,teaching_materials_price) VALUES
('10000000-0000-4000-8000-000000000003','Language Lab','language-lab','service','live',false,50),
('10000000-0000-4000-8000-000000000004','Language Lab Pro','language-lab-pro','service','live',true,NULL),
('10000000-0000-4000-8000-000000000005','Starter Path','starter-path','service','live',false,NULL);
SELECT test_assert(jsonb_array_length(live_library()->'courses')=4,'all four live packages in library');
SELECT test_reject($$SELECT prepare_live_asset('material','10000000-0000-4000-8000-000000000005',NULL,'Private lesson handout','test.pdf','application/pdf',100)$$,'does not include');
SELECT prepare_live_asset('material','10000000-0000-4000-8000-000000000001',NULL,'Hybrid workbook','test.pdf','application/pdf',100)->>'id' AS material \gset
SELECT test_reject(format('SELECT finish_live_asset(%L)', :'material'),'has not finished');
INSERT INTO storage.objects(bucket_id,name,metadata) SELECT bucket,path,jsonb_build_object('size',byte_size,'mimetype',mime_type) FROM live_assets WHERE id=:'material';
SELECT finish_live_asset(:'material');
SELECT test_assert(live_asset_read(:'material'),'admin sees published file');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_assert(live_asset_read(:'material'),'included material is available with active enrollment');
SET ROLE authenticated;
SELECT test_assert((SELECT count(*) FROM storage.objects WHERE bucket_id='live-materials')=1,'storage RLS grants entitled student access');
SELECT test_reject($$INSERT INTO storage.objects(bucket_id,name) VALUES('live-materials','arbitrary/file.pdf')$$,'row-level security');
SELECT test_reject('SELECT * FROM live_assets','permission denied');
RESET ROLE;
SELECT test_reject($$SELECT prepare_live_asset('material','10000000-0000-4000-8000-000000000001',NULL,'Student upload','test.pdf','application/pdf',100)$$,'Only administrators');
SELECT test_reject(format('SELECT remove_live_asset(%L)', :'material'),'cannot remove');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000008',false);
SELECT test_assert(NOT live_asset_read(:'material'),'unenrolled user denied materials');
SET ROLE authenticated;
SELECT test_assert((SELECT count(*) FROM storage.objects WHERE bucket_id='live-materials')=0,'storage RLS denies unenrolled user');
RESET ROLE;
-- The paid add-on follows completed purchases, not just the course enrollment.
INSERT INTO enrollments SELECT gen_random_uuid(),id,'10000000-0000-4000-8000-000000000003','active' FROM users WHERE email IN ('person3@example.invalid','person4@example.invalid');
INSERT INTO purchases(user_id,course_id,status,include_teaching_materials) VALUES('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','completed',true);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_assert(live_material_access('10000000-0000-4000-8000-000000000003'),'paid materials add-on honored');
UPDATE purchases SET status='refunded';
SELECT test_assert(NOT live_material_access('10000000-0000-4000-8000-000000000003'),'refunded add-on denies materials');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
SELECT test_assert(NOT live_material_access('10000000-0000-4000-8000-000000000003'),'enrollment alone does not grant optional materials');
-- Past group recording uploaded once by the actual teacher is shared only with booked students.
UPDATE live_bookings SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour',recording_expires_at=now()+interval '90 days' WHERE group_id='30000000-0000-4000-8000-000000000001';
SELECT id AS group_booking FROM live_bookings WHERE group_id='30000000-0000-4000-8000-000000000001' ORDER BY user_id LIMIT 1 \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT prepare_live_asset('recording',NULL,:'group_booking','Group lesson replay','class.mp4','video/mp4',1000)->>'id' AS recording \gset
SELECT test_assert((SELECT provider='vimeo' AND bucket IS NULL AND path IS NULL FROM live_assets WHERE id=:'recording'),'video stored on Vimeo, not in Supabase');
SELECT test_reject(format('SELECT finish_live_asset(%L)', :'recording'),'Vimeo must verify');
SET ROLE authenticated;
SELECT test_reject('SELECT * FROM live_vimeo_uploads','permission denied');
SELECT test_reject('UPDATE live_assets SET state=''ready''','permission denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SELECT test_assert(NOT live_asset_read(:'recording'),'unfinished upload is hidden from students');
-- Simulate only the trusted edge function writing verified Vimeo status.
INSERT INTO live_vimeo_uploads(asset_id,video_uri,embed_url) VALUES(:'recording','/videos/123456','https://player.vimeo.com/video/123456');
UPDATE live_assets SET state='processing' WHERE id=:'recording';
SELECT test_assert(live_asset_read(:'recording'),'student can see processing state without an exposed upload URL');
UPDATE live_assets SET state='ready' WHERE id=:'recording';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT test_assert(live_asset_read(:'recording'),'teacher can review recording');
SELECT test_reject($$SELECT prepare_live_asset('material','10000000-0000-4000-8000-000000000001',NULL,'Teacher material','test.pdf','application/pdf',100)$$,'Only administrators');
DO $$DECLARE n integer; BEGIN FOR n IN 3..5 LOOP
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-'||lpad(n::text,12,'0'),false);
 PERFORM test_assert(EXISTS(SELECT 1 FROM jsonb_array_elements(live_library()->'assets') a WHERE a->>'kind'='recording'),'each booked group student sees recording');
END LOOP; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
SELECT test_assert(NOT live_asset_read(:'recording'),'other student in same package cannot see group replay');
SELECT test_reject(format('SELECT prepare_live_asset(''recording'',NULL,%L,''Other teacher upload'',''class.mp4'',''video/mp4'',1000)', :'group_booking'),'Only this teacher');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
UPDATE live_bookings SET recording_expires_at=now()-interval '1 second' WHERE id=:'group_booking';
SELECT test_assert(NOT live_asset_read(:'recording'),'expired recording access is denied');
UPDATE live_bookings SET recording_expires_at=now()+interval '90 days' WHERE id=:'group_booking';
UPDATE enrollments SET status='revoked' WHERE user_id=auth.uid() AND course_id='10000000-0000-4000-8000-000000000001';
SELECT test_assert(NOT live_asset_read(:'recording') AND NOT live_asset_read(:'material'),'revocation blocks files and recordings');
UPDATE enrollments SET status='active' WHERE user_id=auth.uid();
UPDATE live_bookings SET status='cancelled' WHERE id=:'group_booking';
SELECT test_assert(NOT live_asset_read(:'recording'),'cancelled group attendee loses replay');
-- Private recording is isolated to its student.
SELECT id AS private_booking FROM live_bookings WHERE user_id='00000000-0000-4000-8000-000000000006' AND kind='private' LIMIT 1 \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT test_reject(format('SELECT prepare_live_asset(''recording'',NULL,%L,''Future replay'',''class.mp4'',''video/mp4'',1000)', :'private_booking'),'after a non-cancelled');
UPDATE live_bookings SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour',recording_expires_at=now()+interval '90 days' WHERE id=:'private_booking';
SELECT prepare_live_asset('recording',NULL,:'private_booking','Private replay','class.webm','video/webm',1000)->>'id' AS private_recording \gset
SELECT test_reject(format('SELECT finish_live_asset(%L)', :'private_recording'),'Vimeo must verify');
INSERT INTO live_vimeo_uploads(asset_id,video_uri,embed_url) VALUES(:'private_recording','/videos/234567','https://player.vimeo.com/video/234567');
UPDATE live_assets SET state='ready' WHERE id=:'private_recording';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000006',false);
SELECT test_assert(live_asset_read(:'private_recording'),'private student sees own replay');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
SELECT test_assert(NOT live_asset_read(:'private_recording'),'other student cannot see private replay');
SET ROLE authenticated;
SELECT test_reject(format('SELECT live_asset_info(%L)', :'private_recording'),'not available');
SELECT test_reject('SELECT * FROM live_vimeo_uploads','permission denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SELECT remove_live_asset(:'private_recording');
SELECT test_assert(NOT live_asset_read(:'private_recording'),'removed file no longer available');
SET ROLE anon;
SELECT test_reject('SELECT live_library()','permission denied');
RESET ROLE;
SELECT 'PASS: all live packages, materials, add-ons, private storage RLS, upload validation, teacher permissions, group replay, expiry and revocation';
