# Live Learning — production setup

## Deployed backend

The existing Supabase project `wsjqkjgshvgjkjajsjgj` has the four Live Learning migrations through `20260921170000`. The integration keeps the existing courses, purchases and enrollments. It does not seed teachers, students or bookings.

The four programs are Language Lab, Language Lab Pro, Starter Path and Hybrid Pack. Both dashboard links and legacy course-viewer links open the live flow. Existing package settings control materials: Hybrid and Pro include them; Language Lab offers a paid add-on; Starter currently does not include them. An administrator can change the included-materials checkbox or optional price in the product editor.

## Vimeo: remaining account setup

Add **`VIMEO_ACCESS_TOKEN`** in **Supabase → Edge Functions → Secrets**. Keep it server-side; never prefix it with `VITE_`, commit it, or put it into chat.

Use an authenticated Vimeo token for the account that owns lesson recordings, with `public`, `private`, `upload`, `edit` and `delete` scopes. The Vimeo API application needs upload access, and the account must support hiding videos from Vimeo and restricting embeds to platform domains. See Vimeo's [token instructions](https://help.vimeo.com/hc/en-us/articles/12427789081745-How-to-generate-a-personal-access-token) and [API upload access](https://help.vimeo.com/hc/en-us/articles/12427803706001-How-to-request-API-upload-access).

`VIMEO_ALLOWED_DOMAINS` is an optional comma-separated server secret. It defaults to `eduway.academy,www.eduway.academy`. Change it if the real platform uses different hostnames. Preview/localhost playback is not allowed by those production defaults.

The deployed `live-vimeo` function checks the caller's identity and booking permission. It creates a single-use upload destination on Vimeo; the browser sends the video there using resumable TUS. Neither the Vimeo account token nor the Supabase service-role key is sent to the browser. The application accepts MP4, MOV and WebM files up to 5 GB, subject to the Vimeo account's available upload quota.

Videos are created hidden from Vimeo, with embedding restricted to the configured domains and downloads disabled. A video remains uploading/processing until the server verifies Vimeo's upload, transcoding and privacy state. Eduway checks enrollment and recording expiry again before returning the embedded player URL. Domain restrictions are not DRM; they do not prevent screen recording.

Removing a recording from Eduway withdraws it from students' libraries and leaves its Vimeo original archived. Automatic cleanup only deletes a newly created video when upload initialization fails. No existing Vimeo videos are modified or deleted during deployment.

## Admin and teacher workflow

1. **Admin → Live Learning → Teachers → Add teacher**: enter the actual teacher's email/profile, assign existing programs, save, configure timezone and availability, and activate.
2. **Invite to workspace** sends the login link explicitly. Saving a profile does not send email. Teachers open **My teaching calendar** after setting their password.
3. **Package materials**: select an existing package and upload PDF, DOCX, PPTX, XLSX, images, audio or text, up to 50 MB. Files are in a private Supabase bucket. Included materials require an active enrollment; optional materials additionally require a completed materials purchase. Refunded add-ons do not grant access.
4. **Lessons & recordings → Past lessons**: admins and the lesson's teacher can upload directly to Vimeo. The pending-recordings filter shows lessons that need a recording. Group recordings are uploaded once and appear for all non-cancelled booked participants; individual recordings are isolated to that student.
5. Students open **Past lessons** from their dashboard or package page and watch recordings in the Vimeo player. Package materials appear in the package workspace. No new purchase or duplicate product is needed.

Weekly private availability, dated group sessions and days off are separate. Calendar changes go live immediately; changes conflicting with existing reservations are rejected. Cancellation and attendance update the credit balance in the database.

## Configurable rules

Initial values: 4 group seats, 60 minutes minimum booking notice, no break, 90 days of recording access, and student self-service cancellation disabled. Set the actual rules in **Programs & rules**. These defaults are not an agreed business policy. Teachers/admins can cancel a booked lesson and return its credit. Completed and missed lessons retain credit usage. Recordings use the access deadline stored on each booking.

Allowances: Language Lab 8 group lessons; Pro 30 group lessons; Starter 5 private lessons; Hybrid 25 group and 5 private lessons. Reservation capacity, overlap, entitlement and credits are checked atomically in the database.

## Deployment and verification

- Database: the four `20260921` migrations are applied to the linked project. New tables have RLS enabled and direct client writes are revoked. A separate migration removes public user-profile reads and prevents student/editor privilege escalation; inactive staff cannot use staff policies.
- Edge functions: `invite-live-teacher` and `live-vimeo` verify authentication internally. Gateway JWT verification is disabled only because the handlers perform their own checks and handle CORS.
- Teacher invitations: set `SITE_URL` to the correct platform origin if different from `https://eduway.academy`. Supabase Auth must allow the `/?auth=teacher-invite` callback and have a working email sender.
- Frontend: publish through the **existing** deployment project with its existing production Supabase/payment environment. Do not publish a local build that lacks production payment variables. Backend deployment does not publish the frontend. The Vercel account currently available to this workspace does not have the production deployment under its selected team.

Checks:

```sh
npm test
npm run test:live-db
npm run build
npx deno check --no-config supabase/functions/live-vimeo/index.ts
```

The database test uses a disposable local Postgres container and never reads project credentials. It covers entitlement, private storage, all four programs, concurrent reservations, group capacity, credits/refunds, teacher isolation, replay sharing, expiry/revocation, profile privacy and role escalation. Unit tests cover the Vimeo API contract, private player URLs, processing state, token isolation, and missing-key UI behavior. Full repository TypeScript checking still reports pre-existing errors outside this integration; it must not be described as passing.

After the Vimeo key is set and the frontend is deployed, do the real acceptance check: sign in as a teacher, upload a short recording for a completed lesson, wait for Vimeo processing, then sign in as that lesson's enrolled student and play it. Verify another enrolled student cannot access a private recording. Verify a group participant can play the shared recording and a cancelled participant cannot. Send a real teacher invitation only when its recipient is ready to receive it.

**Not yet verified:** a real Vimeo upload/transcode/playback (the key has not been supplied), teacher email delivery, and the updated frontend on the production domain. Do not represent these as complete based only on automated tests.
