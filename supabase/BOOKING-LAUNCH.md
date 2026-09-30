# Booking release — 30 September 2026

## Implemented policy

- Requests must be at least 48 hours before the lesson. Pending requests reserve their seat and credit; only an active administrator can confirm or reject them.
- Students may cancel or reschedule with at least 48 hours’ notice. The original credit is returned only with at least 72 hours’ notice. A reschedule in the 48–72-hour window consumes the old credit and requires another credit for its replacement.
- Rescheduling is atomic, uses the same teacher and lesson type, and creates a new pending request. An unavailable replacement or insufficient credits leaves the original reservation unchanged.
- Teacher cancellations return the credit. Staff have a separate action for a student-requested late cancellation. Rejections return the reserved credit. Confirmed no-shows retain it.
- The notification worker expires pending requests at their start time without charging the student. It sends request, approval, rejection, cancellation and meeting-link emails, plus one reminder within 24 hours of a confirmed lesson.
- Playback ends at the student’s configured course end. Downloads can continue until a separately configured deadline. Revoked access and cancelled reservations do not grant recording access. Private no-shows do not grant recording access; group recordings are shared only with eligible participants.
- An administrator must set the student’s course end and download deadline before approving a new request. Existing confirmed lessons retain their prior deadlines until course dates are configured. New dates override the legacy fixed-day recording limit.
- Only active teachers with linked login accounts appear as available to students. Existing reservations and student history remain accessible.

## Verified externally

- All pre-existing migrations through `20260921210000` are applied on project `wsjqkjgshvgjkjajsjgj`.
- The client’s Vimeo token was validated and stored as `VIMEO_ACCESS_TOKEN` in Supabase server secrets. It was not placed in frontend variables or tracked files.
- Two temporary generated test clips uploaded and transcoded successfully with Vimeo-hidden visibility and embedding restricted to `eduway.academy` and `www.eduway.academy`. The temporary clips were removed.
- The Vimeo account reports **Starter**. Neither test returned download links, including a test with video downloads enabled. Vimeo documents API file access as requiring Standard, Advanced, Pro, Business, Premium or Enterprise: https://help.vimeo.com/hc/en-us/articles/12427806914577-About-video-file-download-links-from-the-API
- Production currently has one active profile, **Ana — DEMO**, with no linked login. Real teacher onboarding is still required. No invitations or test emails were sent to real recipients.

## Decisions required before public launch

1. Define how each enrollment’s course end is calculated, and the download grace period after course end. No duration has been invented. The admin form supports explicit per-student dates now; automate their defaults after the rule is agreed.
2. Upgrade the Vimeo account to a plan with API download links, then recheck actual download delivery. Do not call downloads verified based on unit tests.
3. Supply the real teacher profiles, login emails, package assignments and schedules. Send invitations when the recipients are ready. Verify teacher login and a real enrolled student’s request/approval/join workflow.

## Deployment order

This branch prepares the release. The new migrations, worker and frontend have **not** been promoted to production. Only the Vimeo server secret was configured.

Use the existing Supabase project and GitHub → Vercel project, preserving production payment configuration. Deploy the backend and frontend together during the release window; the old frontend does not display the new pending workflow.

```sh
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy live-vimeo --project-ref wsjqkjgshvgjkjajsjgj
npx supabase functions deploy send-booking-notifications --project-ref wsjqkjgshvgjkjajsjgj
node scripts/configure-booking-notifications.mjs
```

The configuration script uses the authenticated Supabase CLI’s macOS Keychain entry or `SUPABASE_ACCESS_TOKEN`, configures a dedicated worker secret in Edge Function secrets and Vault, and installs the one-minute cron job. It never logs secret values. `SENDER_EMAIL`, `RESEND_API_KEY`, and `CONTACT_EMAIL_TO` must remain configured; administration request emails use the existing contact recipient. The optional `SITE_URL` must be the production platform origin.

The worker’s queue uses atomic claims, delivery retries and Resend idempotency keys. No booking succeeds or fails based on an email request. **Programs & rules → Booking operations** displays queued/failed counts; an unattended delivery backlog must be investigated. The worker requires deployment and scheduling before reminders or expired-request cleanup can run.

Merge the release branch into `main` to use the existing Vercel production integration, then confirm the production deployment is successful. Do not deploy a local build without production payment variables.

## Acceptance checks

Automated: `npm test`, `npm run test:live-db`, `npm run build`, relevant ESLint checks, and `npx deno check --no-config supabase/functions/live-vimeo/index.ts supabase/functions/send-booking-notifications/index.ts`.

The database suite uses a disposable Docker database and covers real SQL permissions, pending seat holds, simultaneous reservations, 48/72-hour rules, approval, credit accounting, atomic rescheduling, recording expiry, download access, and the private notification queue. Existing checkout/security tests remain part of the suite. Browser checks use mocked accounts against the local frontend; they are not a production student acceptance test.

After release, use real consenting teacher/student accounts to check request → pending → approve → confirmation email → meeting link → attendance → recording. Check rejection, late cancellation, teacher cancellation, rescheduling failure, reminder delivery, and an enrolled student’s successful recording download. An unrelated student must not access a private recording. A pending lesson must not expose a meeting link or count as attended.

Vimeo download URLs expire on Vimeo’s schedule (normally 24 hours). The platform checks entitlement each time a URL is issued; a link already issued cannot be revoked instantly. A downloaded file is retained by the student. Existing raw Vimeo links are legacy references; upload through the protected library for the full access workflow.
