// Runs only against a disposable local Docker Postgres container. Never uses project credentials.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const container = 'eduway-live-test-' + crypto.randomUUID().slice(0, 8),
  database = 'postgres';
function sql(command) {
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      database,
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    { input: command, encoding: 'utf8' }
  );
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}
function concurrent(command) {
  return new Promise((resolve) => {
    const p = spawn('docker', [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      database,
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ]);
    let out = '',
      err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('exit', (code) => resolve({ code, out, err }));
    p.stdin.end(command);
  });
}
const actor = (n) =>
  `SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-${String(n).padStart(12, '0')}',false);`;
const course = "'10000000-0000-4000-8000-000000000001'",
  teacher = "'20000000-0000-4000-8000-000000000001'";
const choose = `SELECT select_live_teacher(${course},${teacher});`;
const started = spawnSync(
  'docker',
  [
    'run',
    '-d',
    '--name',
    container,
    '--label',
    'eduway.test=live-learning',
    '-e',
    'POSTGRES_PASSWORD=local-test-only',
    'postgres:17-alpine',
  ],
  { encoding: 'utf8' }
);
if (started.status !== 0) throw new Error(started.stderr);
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      spawnSync('docker', ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], {
        stdio: 'ignore',
      }).status === 0
    ) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error('Disposable test database did not start.');
  sql(
    [
      'supabase/tests/live-learning-bootstrap.sql',
      'supabase/migrations/20260921140000_live_learning.sql',
      'supabase/migrations/20260921150000_live_profile_validation.sql',
      'supabase/migrations/20260921160000_live_learning_library.sql',
      'supabase/migrations/20260921170000_user_profile_access.sql',
      'supabase/migrations/20260921200000_booking_quality.sql',
      'supabase/tests/live-learning.sql',
    ]
      .map((path) => fs.readFileSync(path, 'utf8'))
      .join('\n')
  );
  // Baseline entitlement and privacy checks passed. Now exercise concurrent connections.
  const sameSlot = await Promise.all(
    [3, 4].map((n) =>
      concurrent(
        `BEGIN;${actor(n)}SELECT book_live_lesson(${course},${teacher},current_date+1,'13:00');SELECT pg_sleep(0.2);COMMIT;`
      )
    )
  );
  assert.equal(sameSlot.filter((x) => x.code === 0).length, 1, JSON.stringify(sameSlot));
  assert.match(sameSlot.find((x) => x.code !== 0).err, /no longer available/);
  sql(
    `${actor(1)}SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',revision,'groups',(profile->'groups')||jsonb_build_array(jsonb_build_object('id','30000000-0000-4000-8000-000000000002','date',(current_date+14)::text,'start','12:00','program','hybrid-pack','capacity',3,'title','Concurrent group'))) FROM live_teachers WHERE id=${teacher}));`
  );
  const group = await Promise.all(
    [3, 4, 5, 6, 7].map((n) =>
      concurrent(
        `${actor(n)}${choose}SELECT book_live_lesson(${course},${teacher},current_date+14,NULL,'30000000-0000-4000-8000-000000000002');`
      )
    )
  );
  assert.equal(group.filter((x) => x.code === 0).length, 3, JSON.stringify(group));
  assert.equal(
    sql("SELECT count(*) FROM live_bookings WHERE group_id='30000000-0000-4000-8000-000000000002'"),
    '3'
  );
  const credits = await Promise.all(
    [10, 11, 12, 13, 14, 15].map((hour) =>
      concurrent(
        `${actor(7)}${choose}SELECT book_live_lesson(${course},${teacher},current_date+20,'${hour}:00');`
      )
    )
  );
  assert.equal(credits.filter((x) => x.code === 0).length, 5, JSON.stringify(credits));
  assert.match(credits.find((x) => x.code !== 0).err, /No remaining credits/);
  sql(
    `${actor(1)}SELECT save_live_settings('hybrid-pack','{"group_capacity":4,"notice_minutes":60,"buffer_minutes":0,"cancellation_hours":24,"recording_days":90}');`
  );
  sql(
    `${actor(7)}SELECT update_live_booking((SELECT id FROM live_bookings WHERE user_id=auth.uid() AND kind='private' LIMIT 1),'cancel');`
  );
  assert.equal(
    sql(
      "SELECT count(*) FROM live_bookings WHERE user_id='00000000-0000-4000-8000-000000000007' AND kind='private' AND credit_used"
    ),
    '4'
  );
  // Optimistic locking prevents a stale admin/teacher tab overwriting a fresh schedule.
  sql(
    `${actor(1)}SELECT test_reject($cmd$SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',0) FROM live_teachers LIMIT 1))$cmd$,'another session');`
  );
  sql(
    `${actor(3)}SELECT test_reject($cmd$SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',revision) FROM live_teachers LIMIT 1))$cmd$,'Only administrators');`
  );
  // A teacher cannot remove a booked group, or take a booked date off.
  sql(
    `${actor(2)}SELECT test_reject($cmd$SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',revision,'groups','[]'::jsonb) FROM live_teachers LIMIT 1))$cmd$,'cannot be removed');`
  );
  sql(
    `${actor(2)}SELECT test_reject($cmd$SELECT save_live_teacher((SELECT profile||jsonb_build_object('revision',revision,'daysOff',jsonb_build_array((current_date+1)::text)) FROM live_teachers LIMIT 1))$cmd$,'Time off conflicts');`
  );
  sql(fs.readFileSync('supabase/tests/booking-quality.sql', 'utf8'));
  sql(fs.readFileSync('supabase/tests/live-library.sql', 'utf8'));
  sql(fs.readFileSync('supabase/tests/profile-access.sql', 'utf8'));
  sql(
    [
      'supabase/tests/admin-analytics-bootstrap.sql',
      'supabase/migrations/20260921180000_admin_analytics.sql',
      'supabase/migrations/20260921190000_admin_user_metrics.sql',
      'supabase/migrations/20260921210000_actionable_account_checks.sql',
      'supabase/tests/admin-analytics.sql',
    ]
      .map((path) => fs.readFileSync(path, 'utf8'))
      .join('\n')
  );
  console.log(
    'PASS: admin analytics authorization, registration cohorts, revenue currencies/refunds, progress and group session counts.'
  );
  console.log(
    'PASS: private files, all live programs, material entitlements, teacher uploads, group sharing, expiry, cancellation and revoked access.'
  );
  console.log(
    'PASS: concurrent private slot, concurrent group capacity, concurrent credits, eligible cancellation, stale updates, teacher isolation, booked-calendar protection.'
  );
} finally {
  spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
}
