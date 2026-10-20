// Disposable Postgres WASM only. No credentials, network, messages, or production writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261021090000_publish_teacher_group_sessions.sql');
test('publication preserves private time, policies, existing sessions, bookings and days off, and is repeatable', async () => {
  const db = new PGlite();
  try {
    for (const path of [
      'supabase/tests/live-learning-bootstrap.sql',
      'supabase/migrations/20260921140000_live_learning.sql',
      'supabase/migrations/20260921150000_live_profile_validation.sql',
      'supabase/migrations/20260921200000_booking_quality.sql',
    ])
      await db.exec(read(path));
    await db.exec(
      read('supabase/migrations/20261001103000_live_history.sql').split(
        'DROP FUNCTION live_workspace();'
      )[0] + '\nCOMMIT;'
    );
    await db.exec(read('supabase/migrations/20261016100000_optional_teacher_email.sql'));
    await db.exec(read('supabase/migrations/20261016101000_seed_teacher_profiles.sql'));
    await db.exec(`
   UPDATE live_teachers SET profile=jsonb_set(profile,'{status}','"active"');
   UPDATE live_program_settings SET notice_minutes=2880,buffer_minutes=5;
   INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001','calendar@example.invalid');
   INSERT INTO users VALUES ('00000000-0000-4000-8000-000000000001','calendar@example.invalid','Calendar test','admin','active');
   INSERT INTO courses VALUES ('10000000-0000-4000-8000-000000000001','Hybrid Pack','hybrid-pack','service','hybrid',false,NULL);
   INSERT INTO enrollments VALUES ('80000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','active');
   SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
   SELECT save_live_teacher(profile||jsonb_build_object('revision',revision,'daysOff',jsonb_build_array((date_trunc('week',current_date)::date+9)::text),
    'groups',jsonb_build_array(jsonb_build_object('id','30000000-0000-4000-8000-000000000001','date',(date_trunc('week',current_date)::date+7)::text,'start','16:00','program','language-lab-pro','capacity',4,'title','Existing class'))))
    FROM live_teachers WHERE profile->>'name'='Ana';
   INSERT INTO live_bookings(enrollment_id,user_id,course_id,teacher_id,program,kind,starts_at,ends_at,timezone,title)
    VALUES('80000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','7f728974-cd84-4dd3-9643-f5f532df2b01','hybrid-pack','private',
     live_start(date_trunc('week',current_date)::date+8,'16:00','Europe/Rome'),live_start(date_trunc('week',current_date)::date+8,'16:30','Europe/Rome'),'Europe/Rome','Existing private');
   CREATE TEMP TABLE before_teachers AS SELECT id,profile,revision FROM live_teachers;
   CREATE TEMP TABLE before_rules AS SELECT * FROM live_program_settings;
   CREATE TEMP TABLE before_bookings AS SELECT * FROM live_bookings;
  `);
    await db.exec(migration);
    const query = async (sql) => (await db.query(sql)).rows;
    const counts = await query(
      `SELECT t.profile->>'name' AS name,g->>'program' AS program,count(*)::int AS n FROM live_teachers t,jsonb_array_elements(t.profile->'groups') g GROUP BY 1,2`
    );
    assert.equal(counts.length, 9);
    assert.ok(
      counts.every((c) => c.n >= 30),
      JSON.stringify(counts)
    );
    assert.deepEqual(
      await query(`SELECT profile-'groups' AS profile FROM live_teachers ORDER BY id`),
      await query(`SELECT profile-'groups' AS profile FROM before_teachers ORDER BY id`)
    );
    assert.deepEqual(await query('TABLE live_program_settings'), await query('TABLE before_rules'));
    assert.deepEqual(await query('TABLE live_bookings'), await query('TABLE before_bookings'));
    assert.equal(
      (
        await query(`SELECT count(*)::int n FROM live_teachers t,jsonb_array_elements(t.profile->'groups') g WHERE g->>'source'='weekly-launch-20261021' AND (
    t.profile->'daysOff' ? (g->>'date') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.profile->'weekly') w WHERE (w->>'day')::int=extract(isodow FROM (g->>'date')::date)::int-1 AND (g->>'start')::time>=(w->>'start')::time AND (g->>'start')::time+interval '85 minutes'<=(w->>'end')::time)
    OR live_start((g->>'date')::date,g->>'start',t.profile->>'timezone')<now()+interval '48 hours'
   )`)
      )[0].n,
      0
    );
    assert.equal(
      (
        await query(
          `SELECT count(*)::int n FROM live_group_sessions g JOIN live_bookings b ON b.teacher_id=g.teacher_id AND tstzrange(b.starts_at-interval '5 minutes',b.ends_at+interval '5 minutes','[)') && tstzrange(g.starts_at,g.starts_at+interval '50 minutes','[)')`
        )
      )[0].n,
      0
    );
    assert.equal(
      (
        await query(
          `SELECT count(*)::int n FROM live_group_sessions a JOIN live_group_sessions b ON a.teacher_id=b.teacher_id AND a.id<b.id AND tstzrange(a.starts_at-interval '5 minutes',a.starts_at+interval '55 minutes','[)') && tstzrange(b.starts_at,b.starts_at+interval '50 minutes','[)')`
        )
      )[0].n,
      0
    );
    const first = await query('SELECT id,profile,revision FROM live_teachers ORDER BY id');
    const archive = await query('SELECT * FROM live_group_sessions ORDER BY id');
    assert.equal(
      archive.length,
      counts.reduce((sum, c) => sum + c.n, 0)
    );
    await db.exec(migration);
    assert.deepEqual(
      await query('SELECT id,profile,revision FROM live_teachers ORDER BY id'),
      first
    );
    assert.deepEqual(await query('SELECT * FROM live_group_sessions ORDER BY id'), archive);
  } finally {
    await db.close();
  }
});
