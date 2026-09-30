// Run only after the booking migrations and worker are deployed. Credentials are
// read from the environment or the Supabase CLI's macOS Keychain entry, never logged.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const project = process.env.SUPABASE_PROJECT_REF || 'wsjqkjgshvgjkjajsjgj';
if (!/^[a-z0-9]{20}$/.test(project)) throw new Error('Invalid Supabase project reference.');
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && process.platform === 'darwin') {
  token = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  if (token.startsWith('go-keyring-base64:'))
    token = Buffer.from(token.split(':')[1], 'base64').toString();
}
if (!token) throw new Error('Authenticate Supabase CLI or set SUPABASE_ACCESS_TOKEN.');
async function api(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw new Error(`Supabase ${path} failed (${response.status}); no secrets have been printed.`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
const query = (sql) => api('database/query', { query: sql });
const [ready] = await query(
  "select to_regprocedure('public.prepare_live_booking_notifications()') is not null as ready"
);
if (!ready?.ready)
  throw new Error('Deploy booking migrations and worker before configuring the schedule.');
const rows = await query(
  "select decrypted_secret from vault.decrypted_secrets where name='booking_notification_secret'"
);
const secret = rows[0]?.decrypted_secret || randomBytes(32).toString('hex');
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
await api('secrets', [{ name: 'BOOKING_NOTIFICATION_SECRET', value: secret }]);
await query(`DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='booking_notification_secret') THEN
  PERFORM vault.create_secret(${literal(secret)},'booking_notification_secret');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='booking_site_url') THEN
  PERFORM vault.create_secret('https://${project}.supabase.co','booking_site_url');
 ELSE
  PERFORM vault.update_secret((SELECT id FROM vault.secrets WHERE name='booking_site_url'),'https://${project}.supabase.co');
 END IF;
END $$;`);
await query(
  readFileSync(new URL('../supabase/booking-notification-schedule.sql', import.meta.url), 'utf8')
);
const jobs = await query(
  "select active from cron.job where jobname='eduway-booking-notifications'"
);
if (!jobs[0]?.active) throw new Error('The worker schedule is not active.');
console.log('Booking email worker scheduled every minute. Secret values were not printed.');
