-- Publish the supplied teachers' hours as dated group sessions for launch.
-- Rotate the three group programs; keep at least 30 minutes per window private.
-- Existing sessions, bookings, time off, policies and weekly hours take priority.
BEGIN;
DO $$
DECLARE
 teacher live_teachers;
 weekly_window jsonb;
 session jsonb;
 additions jsonb;
 lesson_date date;
 slot time;
 finish time;
 starts timestamptz;
 gap integer;
 slot_index integer;
 teacher_index integer:=0;
 program_ids text[];
 program_id text;
 program_name text;
 rules live_program_settings;
 session_id uuid;
 first_date date;
BEGIN
 FOR teacher IN SELECT * FROM live_teachers
  WHERE id IN ('7f728974-cd84-4dd3-9643-f5f532df2b01','7f728974-cd84-4dd3-9643-f5f532df2b02','7f728974-cd84-4dd3-9643-f5f532df2b03')
   AND profile->>'status'='active' ORDER BY id
 LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(teacher.id::text,1));
  -- Read after the booking lock, then lock the profile against concurrent edits.
  SELECT * INTO teacher FROM live_teachers WHERE id=teacher.id FOR UPDATE;
  SELECT array_agg(p ORDER BY ord) INTO program_ids
   FROM unnest(ARRAY['language-lab','language-lab-pro','hybrid-pack']) WITH ORDINALITY AS programs(p,ord)
   WHERE teacher.profile->'programs' ? p;
  IF coalesce(cardinality(program_ids),0)=0 THEN CONTINUE; END IF;
  SELECT coalesce(max(buffer_minutes),0) INTO gap FROM live_program_settings
   WHERE teacher.profile->'programs' ? program;
  additions:='[]';
  first_date:=(now() AT TIME ZONE (teacher.profile->>'timezone'))::date;
  FOR day_offset IN 0..111 LOOP
   lesson_date:=first_date+day_offset;
   IF teacher.profile->'daysOff' ? lesson_date::text THEN CONTINUE; END IF;
   slot_index:=0;
   FOR weekly_window IN SELECT value FROM jsonb_array_elements(teacher.profile->'weekly')
    WHERE (value->>'day')::int=extract(isodow FROM lesson_date)::int-1 ORDER BY value->>'start'
   LOOP
    slot:=(weekly_window->>'start')::time;
    finish:=(weekly_window->>'end')::time;
    -- Leave a private lesson and the required break after the final group.
    WHILE slot+make_interval(mins=>80+gap)<=finish
      AND slot+make_interval(mins=>80+gap)>slot LOOP
     program_id:=program_ids[1+mod(lesson_date-date '2026-01-01'+teacher_index+slot_index,cardinality(program_ids))];
     slot_index:=slot_index+1;
     SELECT * INTO STRICT rules FROM live_program_settings WHERE program=program_id;
     starts:=live_start(lesson_date,left(slot::text,5),teacher.profile->>'timezone');
     session_id:=md5('weekly-launch-20261021:'||teacher.id::text||':'||lesson_date::text||':'||slot::text||':'||program_id)::uuid;
     IF starts>=now()+make_interval(mins=>rules.notice_minutes)
      AND ((lesson_date+slot) AT TIME ZONE (teacher.profile->>'timezone')) AT TIME ZONE (teacher.profile->>'timezone')=lesson_date+slot
      AND NOT EXISTS(SELECT 1 FROM live_group_sessions WHERE id=session_id)
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(teacher.profile->'groups') g
       WHERE tstzrange(live_start((g->>'date')::date,g->>'start',teacher.profile->>'timezone')-make_interval(mins=>gap),live_start((g->>'date')::date,g->>'start',teacher.profile->>'timezone')+interval '50 minutes'+make_interval(mins=>gap),'[)') && tstzrange(starts,starts+interval '50 minutes','[)'))
      AND NOT EXISTS(SELECT 1 FROM live_bookings b WHERE b.teacher_id=teacher.id AND b.status<>'cancelled'
       AND tstzrange(b.starts_at-make_interval(mins=>gap),b.ends_at+make_interval(mins=>gap),'[)') && tstzrange(starts,starts+interval '50 minutes','[)'))
     THEN
      IF rules.group_capacity NOT BETWEEN 3 AND 5 THEN RAISE EXCEPTION 'Configure a group capacity of 3–5 before publishing.'; END IF;
      program_name:=CASE program_id WHEN 'language-lab' THEN 'Language Lab' WHEN 'language-lab-pro' THEN 'Language Lab Pro' ELSE 'Hybrid Pack' END;
      session:=jsonb_build_object('id',session_id,'date',lesson_date::text,'start',left(slot::text,5),'program',program_id,'capacity',rules.group_capacity,'title',program_name||' · '||(teacher.profile->>'name'),'source','weekly-launch-20261021');
      additions:=additions||jsonb_build_array(session);
     END IF;
     EXIT WHEN slot+make_interval(mins=>greatest(60,50+gap))<=slot;
     slot:=slot+make_interval(mins=>greatest(60,50+gap));
    END LOOP;
   END LOOP;
  END LOOP;
  IF jsonb_array_length(additions)>0 THEN
   IF (SELECT count(*) FROM jsonb_array_elements((teacher.profile->'groups')||additions) g WHERE (g->>'date')::date>=first_date)>500 THEN
    RAISE EXCEPTION 'Publication would exceed the teacher calendar limit.';
   END IF;
   UPDATE live_teachers SET profile=jsonb_set(profile,'{groups}',
     (SELECT jsonb_agg(g ORDER BY g->>'date',g->>'start',g->>'id') FROM jsonb_array_elements((teacher.profile->'groups')||additions) g)),
     revision=revision+1,updated_at=now() WHERE id=teacher.id;
   INSERT INTO live_group_sessions(id,teacher_id,starts_at,session)
    SELECT (g->>'id')::uuid,teacher.id,live_start((g->>'date')::date,g->>'start',teacher.profile->>'timezone'),g
    FROM jsonb_array_elements(additions) g;
  END IF;
  teacher_index:=teacher_index+1;
 END LOOP;
END $$;
COMMIT;
