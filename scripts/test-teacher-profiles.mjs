// Disposable Postgres (WASM). No project credentials, network, or emails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const optionalEmail = read('supabase/migrations/20261016100000_optional_teacher_email.sql');
const seed = read('supabase/migrations/20261016101000_seed_teacher_profiles.sql');

test('real SQL saves email-free profiles and schedules, then links an email added later', async () => {
  const db = new PGlite();
  try {
    for (const path of [
      'supabase/tests/live-learning-bootstrap.sql',
      'supabase/migrations/20260921140000_live_learning.sql',
      'supabase/migrations/20260921150000_live_profile_validation.sql',
      'supabase/migrations/20260921200000_booking_quality.sql',
    ]) await db.exec(read(path));
    // Load the current save RPC and its calendar index before testing its replacement.
    await db.exec(read('supabase/migrations/20261001103000_live_history.sql').split('DROP FUNCTION live_workspace();')[0] + '\nCOMMIT;');
    await db.exec(optionalEmail + seed);
    const profiles = (await db.query('SELECT email,user_id,profile FROM live_teachers ORDER BY profile->>\'name\'')).rows;
    assert.deepEqual(profiles.map((t) => t.profile.name), ['Ana', 'Erika', 'Juliana']);
    for (const { email, user_id, profile } of profiles) {
      assert.equal(email, null);
      assert.equal(user_id, null);
      assert.equal(profile.email, '');
      assert.equal(profile.timezone, 'Europe/Rome');
      assert.equal(profile.status, 'draft');
      assert.deepEqual(profile.programs, ['language-lab', 'language-lab-pro', 'starter-path', 'hybrid-pack']);
    }
    const hours = (profile) => profile.weekly.map(({ day, start, end }) => [day, start, end]);
    assert.deepEqual(hours(profiles[0].profile), [0, 1, 2, 3, 4].map((d) => [d, '16:00', '19:00']));
    assert.deepEqual(hours(profiles[1].profile), [[0, '17:30', '19:00'], [2, '17:30', '18:30'], [3, '15:00', '18:30'], [4, '14:30', '18:00']]);
    assert.match(profiles[1].profile.availabilityNotes, /13 October 2026/);
    assert.deepEqual(hours(profiles[2].profile), [[1, '15:00', '18:00'], [2, '15:00', '20:00'], [4, '15:00', '18:00'], [4, '19:00', '20:00']]);
    await db.exec(`
      INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001','admin@example.invalid'),('00000000-0000-4000-8000-000000000002','ana@example.invalid'),('00000000-0000-4000-8000-000000000003','');
      INSERT INTO public.users VALUES ('00000000-0000-4000-8000-000000000001','admin@example.invalid','Admin','admin','active'),('00000000-0000-4000-8000-000000000002','ana@example.invalid','Ana','student','active');
      SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
    `);
    const save = (name, patch = {}) => db.query(`SELECT save_live_teacher(profile || jsonb_build_object('revision',revision) || $1::jsonb) FROM live_teachers WHERE profile->>'name'=$2`, [JSON.stringify(patch), name]);
    await save('Ana', { email: '  ' });
    await save('Erika');
    await save('Juliana');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM live_teachers WHERE user_id IS NOT NULL')).rows[0].n, 0);
    await assert.rejects(save('Ana', { email: 'invalid' }), /valid name, email/);
    await save('Ana', { email: ' Ana@Example.Invalid ' });
    let ana = (await db.query("SELECT * FROM live_teachers WHERE profile->>'name'='Ana'")).rows[0];
    assert.equal(ana.email, 'ana@example.invalid');
    assert.equal(ana.user_id, '00000000-0000-4000-8000-000000000002');
    await assert.rejects(save('Erika', { email: 'ana@example.invalid' }), /unique constraint/);
    await assert.rejects(save('Ana', { email: '' }), /linked login email cannot be changed/);
    await assert.rejects(save('Ana', { revision: 0 }), /another session/);
    await assert.rejects(db.query('UPDATE live_teachers SET email=NULL WHERE id=$1', [ana.id]), /identity does not match/);
    await assert.rejects(save('Erika', { availabilityNotes: {} }), /Availability notes must be text/);
    await db.exec(seed);
    ana = (await db.query("SELECT * FROM live_teachers WHERE profile->>'name'='Ana'")).rows[0];
    assert.equal(ana.email, 'ana@example.invalid');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM live_teachers')).rows[0].n, 3);
    await db.exec("SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false)");
    await assert.rejects(save('Erika'), /Only administrators/);
  } finally {
    await db.close();
  }
});

test('invitation endpoint rejects a missing email before claiming or sending an invitation', async () => {
  let handler;
  let tableReads = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } } }) },
    from(table) {
      tableReads++;
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: table === 'users'
          ? { role: 'admin', status: 'active' }
          : { id: '7f728974-cd84-4dd3-9643-f5f532df2b01', email: null } }),
      };
      return query;
    },
  };
  const source = ts.transpileModule(read('supabase/functions/invite-live-teacher/index.ts')
    .replace(/import \{ createClient \} from '[^']+';/, 'const createClient = globalThis.createTestClient;'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  vm.runInNewContext(source, {
    createTestClient: () => client,
    Deno: { env: { get: () => 'test-only' }, serve: (fn) => { handler = fn; } },
    Response,
  });
  const response = await handler(new Request('https://example.invalid/invite', {
    method: 'POST', headers: { authorization: 'Bearer test-only', 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId: '7f728974-cd84-4dd3-9643-f5f532df2b01' }),
  }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /Add a valid email/);
  assert.equal(tableReads, 2);
});
