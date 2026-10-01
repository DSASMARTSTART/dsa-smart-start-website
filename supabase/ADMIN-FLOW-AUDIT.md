# Admin workflow and video capacity audit — 30 September 2026

**Remediation update — 1 October:** the original findings below describe the pre-fix revision. The booking-readiness branch now implements the operational fixes; see [the admin operations release notes](BOOKING-LAUNCH.md#admin-operations-release) for the exact controls, validation, limitations and deployment order. No new production deployment or real invitations were performed during these fixes.

Most routine teacher, course, and lesson administration is connected. The panel is not yet a complete operational console: teacher introduction videos are link-only, staff cannot book/reschedule on a student's behalf, credits are fixed by program, and several support/reporting flows need correction. The prepared booking release is not deployed to production.

This audit covers every section in the admin navigation and the supporting teacher/student workflows. “Connected” below means the UI calls an implemented database/storage/function operation; it does **not** certify that every external service has passed a real production acceptance test.

## Evidence and limits

- Reviewed all nine admin sections: Dashboard, Users, Live Learning, Courses, Transactions, Payment Orphans, Discount Codes, Audit Log, Settings. Traced their handlers into APIs, SQL, storage policies and Edge Functions.
- Read-only production inspection: latest migration is `20260921210000`; one active teacher profile, zero linked teacher logins, zero teacher photos and zero introduction links. The four live packages are published with prices €200 / €599 / €160 / €599; the earlier €1 test-price migration does not describe current live prices.
- Production buckets exist: public `teacher-photos` (5 MiB file limit), public `course-images`, private `ebooks`, private `live-materials` (50 MiB limit). Current Supabase objects total approximately 53 MB, all in `course-images`; this excludes externally linked files and Vimeo.
- Local browser, mocked service responses: completed Add teacher → photo selection → biography/video URL → program selection → save. Verified the photo-storage POST and `save_live_teacher` payload containing the returned HTTPS photo URL, introduction URL, selected program and draft status. No real teacher was created or invited.
- Local browser: inspected the pending queue and program rules, submitted explicit course/download dates and 48/72-hour rules to their mocked RPCs. This checks browser wiring, not production database persistence.
- At a 390px mobile viewport, Programs & rules produced a 461px-wide document. The rules/form grid needs a separate responsive-layout fix; the earlier booking-tab overflow fix does not cover this screen.
- Earlier checks on this same unchanged application revision passed: 119 unit/component tests, disposable database suite, production build, changed-area lint, and checks for the Vimeo/notification Edge Functions. The SQL suite includes teacher authorization, schedules/conflicts, concurrent bookings, analytics, pending approvals, credits, recording access and notification permissions. Those tests do not exercise every admin CRUD action or bank/email delivery.
- Earlier Vimeo integration checks uploaded and processed two generated clips and then deleted them. The account reported Starter; no API download links were returned. A real enrolled student's playback/download test remains outstanding.
- No production data changes, invitations, payments or emails were performed in this audit. Application code is unchanged; this report records findings rather than implementing the missing features.

## Admin capability matrix

| Area / staff action | Current connection | Limitation or next step |
|---|---|---|
| Dashboard: registrations, revenue, course progress, attendance, account issues | Database reporting RPCs, period/currency selectors, student drill-down and CSV | Active administrator only. Health checks identify issues; they do not automatically repair every issue. |
| Users: search, details, notes, pause/unpause | Connected to user records and metrics | Some mutation errors only reach the console. Make failed actions visible to staff. |
| Users: grant/revoke course access | Connected to enrollments | Re-granting a revoked course fails because grant inserts a duplicate unique user/course pair. See findings. |
| Users: delete account | Sets `users.status='deleted'` | UI says permanent deletion of the account and progress, but implementation is soft deletion. |
| Users: create/invite a new student | No general admin flow | Students register themselves. Teacher invitation is a separate implemented flow. |
| Users: change staff role | Student/admin/editor roles | No secretary role with booking-only permissions. Editors cannot approve lessons; granting admin grants broader power. |
| Teachers: add/edit profile | Name, email, biography, languages, timezone, program assignments | New profiles start as drafts. A linked login and active profile are needed for new student bookings in the release. |
| Teachers: photo | Direct file upload to `teacher-photos`; JPG/PNG/WebP, up to 5 MiB | No crop/compression or old-photo cleanup. Replacing/removing a photo leaves its old object in storage. |
| Teachers: introduction video | Saves an HTTPS URL; student opens it in a new tab | No video file upload, processing state, embed preview, or playable-link verification. A Vimeo video hidden from Vimeo's website cannot simply be used as an external watch-page link. |
| Teachers: login invitation | Admin-only `invite-live-teacher`; account linking and password setup | Depends on Supabase Auth email delivery and allowed redirects. Uses Auth email, separate from booking emails. A linked account's email cannot be changed in this form. |
| Teachers: activate/deactivate | Connected to teacher status | Deactivation does not automatically reassign/cancel existing lessons. Review those bookings first. |
| Teacher workspace | Linked teacher can manage their own profile/calendar/recordings | Teacher cannot change their email, program assignments or administrative status. |
| Calendar: weekly private availability | Connected, timezone-aware, overlap/break checks | Private lessons fixed at 30 minutes. No external calendar synchronization. |
| Calendar: group sessions | Date/time/program/title, 3–5 seats, meeting link and legacy recording link | Groups fixed at 50 minutes; created one session at a time. No recurring group-series generator. Reserved groups cannot simply be moved or deleted. |
| Calendar: time off | Connected; existing reservations block conflicting time off | Staff must resolve booked lessons first; there is no substitute-teacher/bulk-resolution flow. |
| Booking: pending approvals/rejections | Implemented in prepared release; admin approval reserves/returns credits correctly | New migrations/frontend/worker still need release. Course dates must be set before approval. |
| Booking: completion/no-show and cancellations | Connected, with separate teacher/student cancellation actions in release | Group reservations are managed per student. No one-click whole-session cancellation with all notifications. |
| Booking: student reschedule | Atomic replacement, same teacher/type, 48/72-hour credit rules | Staff cannot reschedule or create a booking on a student's behalf. No teacher reassignment flow. |
| Booking rules | Notice, break, cancellation and credit-return cutoffs; group capacity | Credit amounts and lesson lengths remain fixed in code/SQL. No extra-credit adjustment ledger or new-program builder. |
| Course end and download dates | Per-enrollment admin form in prepared release | Defaults are not automatic; agreed course-duration/download policy is still pending. |
| Meeting links | Admin/teacher can enter HTTPS links for lessons/groups | No Zoom/Meet API meeting creation, calendar invitations, automatic recording capture or automatic import. |
| Lesson recording upload | Direct browser-to-Vimeo resumable upload, processing checks, protected library | MP4/MOV/WebM, up to 5 GiB per file. Uploads retry while the page stays open; no guaranteed resume after closing the page. |
| Recording access and download | Per-student checks; group recording shared with eligible attendees | API downloads need a supported Vimeo account plan and a real acceptance test. Raw legacy links do not offer the complete managed library workflow. |
| Recording removal | Hides the asset in Eduway | Does **not** delete the Vimeo video or free its storage. No expiry cleanup, usage dashboard, or bulk archive/delete workflow. |
| Package materials | Private Supabase uploads, signed downloads, package/add-on entitlement checks | Admin manages package-level materials. Teachers have recording management, not a general package-material publishing console. |
| Courses: create/edit/publish/unpublish | Database-backed catalog, pricing/payment methods, modules, lessons, homework/quizzes, landing copy, thumbnails | Course instructor fields are independent text fields, not linked to live teacher profiles. Live program identities/entitlements cannot be freely defined here. |
| Course lesson videos | Primary/fallback video URLs, provider selection, embed/link preview | No direct Vimeo file-upload workflow in the course lesson editor. |
| E-books | Private PDF upload and authorized download endpoint; external links also supported | Legacy external links require their own access handling; a pasted public link is not made private by the app. |
| Course translations | Student-facing localized fields exist | Course editor does not expose the Italian/Serbian/Spanish title/description fields. Existing translations can become stale after editing the base content. |
| Transactions | Purchase list, filters, invoice generation/resend, refund recording | Currency totals, CSV and product filtering have correctness gaps. Actual money refunds remain manual in the bank portal. |
| Payment Orphans | Match to existing user/course, mark refunded, dismiss, record notes | Matching is a staff decision, not automatic proof from the bank. Marking refunded does not move money. |
| Discount codes | Create/edit/activate/deactivate/delete; value, expiry, minimum order, usage limits | Server checkout validation exists. Admin change audit coverage is incomplete. |
| Audit log | Displays stored user/course/enrollment/refund events | Live teacher/schedule/booking/rule changes are not written into this central audit log. Filters apply only to the current page. |
| Settings | Company/banking details, VAT/FX, invoice numbering and invoice email recipients | No API/OAuth connection screen, booking-email editor, worker scheduling or SMTP setup. Booking sender/recipient are server configuration, not these invoice settings. |

## Findings to address

### 1. Restore revoked access reliably

`data/supabaseStore.ts:372` always inserts an enrollment. The available-course selector excludes only non-revoked rows, so a revoked course is offered again. Production has `UNIQUE(user_id, course_id)`, making that insert fail. Implement explicit reactivation preserving the enrollment identity, booking history and course terms; do not silently reset credits. The optional grant reason is currently discarded and should be retained in the audit event.

### 2. Correct transaction reporting and exports

`components/admin/AdminTransactions.tsx:192` sums purchase amounts without fetching or separating currency. A €100 order and an RSD11,700 order become a meaningless 11,800 total. The newer Dashboard reporting already handles currencies separately; reuse that approach.

The transaction export only includes the loaded page, prefixes all amounts with euros, and joins cells without CSV quoting or spreadsheet-formula neutralization. Product filtering also happens after database pagination, producing incomplete pages/counts. Fix these before staff use this screen for bookkeeping. Search is transaction-ID-only despite a code comment suggesting customer search.

### 3. Complete teacher media management

`components/live-learning/LiveLearningStudio.tsx:1433` is a URL input. Extend the managed Vimeo uploader to a teacher-introduction asset type, with progress, processing, replace/remove and student-facing embedding. The current recording uploader requires a booking ID and cannot simply be reused unchanged. Keep publicity rules distinct: an introduction and an enrolled student's lesson recording have different audiences.

Add photo resizing/cropping and cleanup for replaced or failed-save uploads. The current flow can save photos successfully; the missing work is asset lifecycle and convenience.

### 4. Add the staff actions needed for daily exceptions

The current student reschedule RPC explicitly permits only the booking's student. Add staff book/reschedule/reassign operations that use the same server-side conflict and credit rules, retain reasons, and send notifications. Add whole-group cancellation/reschedule tools and an auditable credit-adjustment ledger if the secretary must handle exceptions without developer intervention.

A secretary currently needs the admin role to approve bookings. Define a narrower operations role if they should not also control users, prices and financial settings. Align the visible navigation/buttons with actual permissions so editors are not presented with actions they cannot complete.

### 5. Make recording retention operational

`supabase/functions/live-vimeo/index.ts:84` only removes the app asset; it explicitly retains the Vimeo original. Access expiry also does not delete files. Consequently, six-month capacity estimates only hold if an actual deletion/archive policy is implemented. Otherwise usage accumulates for the lifetime of the account.

Add storage/bandwidth visibility, usage alerts, failed-upload cleanup, and a deliberate delete/archive queue. For a shared group recording, deletion must wait until the latest entitled participant's playback/download deadline, not just the first student's course end. Any separate archive requires its own storage budget.

### 6. Prepare lists and calendars for volume

`live_workspace` returns the full authorized booking history and teacher profiles; `live_library` aggregates the authorized assets without pagination. Visible tabs refresh every 30 seconds. This will become costly and cumbersome with thousands of sessions/videos. Add date ranges, server pagination/search, and background processing-status updates.

Teacher calendars store group sessions in profile JSON and cap the list at 500. Historical groups with non-cancelled bookings cannot be removed through profile editing. At 20 group sessions/week, a teacher approaches that ceiling in 25 weeks. A separate session table/history view is needed before that scale; more Vimeo storage does not solve this application limit.

### 7. Remove misleading controls and stale metadata

- Account “Delete” claims permanent account/progress deletion but only sets a status (`AdminUsers.tsx:443`, `data/supabaseStore.ts:326`). Rename it or implement a separate, explicit deletion process.
- Courses-list average progress is hardcoded to zero (`data/supabaseStore.ts:1365`); Dashboard progress is calculated separately.
- Programs & rules displays static prices from `components/live-learning/model.ts`. Editing a catalog price does not update those figures. Course/package display and entitlement data should have one authoritative source.
- Teacher bios/media are separate from course instructor text. Course translations and much of the public site's copy are not administered through this panel.
- Central audit events need coverage for live operations/settings/discount changes; the existing client audit helper ignores insert failures.
- Email templates are not editable in the panel. Booking notifications are currently English, even though the student interface supports multiple languages.
- Programs & rules has confirmed horizontal overflow on a 390px viewport. Make form/grid children shrink and wrap; verify long student/package names as well as the policy controls before relying on mobile administration.

## What can remain outside the admin panel

API keys, bank credentials, SMTP, deployment and the scheduled worker need one-time service configuration. They should remain server-side. A future restricted “Connections” screen can manage connection status and safe authorization; it must not put secrets into frontend variables or the publicly readable `app_settings` table.

Vimeo handles video storage/processing/playback. Supabase holds application data, photos and documents. The web host serves the application. The current direct upload design does not require a second full video copy on the web host or Supabase.

Before public launch, the existing release still needs deployment, real teacher onboarding, working invitation/notification delivery, defined course/download dates, a supported Vimeo download plan, and a consenting teacher/student acceptance run. See [BOOKING-LAUNCH.md](BOOKING-LAUNCH.md). A manual meeting-link and bank-refund workflow can be used initially if staff explicitly understand it.

## Vimeo capacity estimate

These are planning scenarios, not measurements of actual lesson recordings. Record 5–10 representative lessons and use their average file size before purchasing capacity. Vimeo counts the original uploaded file size toward storage; bitrate, audio and export settings matter more than resolution alone. [Vimeo storage calculation](https://help.vimeo.com/hc/en-us/articles/26238598856465-How-do-I-estimate-the-amount-of-storage-my-video-file-will-use-up-on-my-Vimeo-account)

Approximate decimal GB = total audio/video bitrate in Mbps × duration in hours × 0.45. A 50-minute file is about 0.56 GB at 1.5 Mbps, 0.94 GB at 2.5 Mbps, or 1.50 GB at 4 Mbps. A 30-minute file at the same bitrate is 60% as large. These are examples, not guaranteed output sizes or a universal encoding recommendation.

The table assumes **1 GB per recorded session**, 52 weeks/year, and adds **20% contingency** to retained-storage totals. It excludes an existing video library or separate backup. Count group sessions once for storage, not once per attendee.

| Recorded sessions/week | New uploads/month, average | Six months retained, including contingency | Twelve months retained, including contingency |
|---:|---:|---:|---:|
| 50 | 217 GB | 1.56 TB | 3.12 TB |
| 100 | 433 GB | 3.12 TB | 6.24 TB |
| 200 | 867 GB | 6.24 TB | 12.48 TB |
| 500 | 2.17 TB | 15.60 TB | 31.20 TB |

For 2 GB average recordings, double every number. For 0.5 GB, halve them. Add introduction videos and prerecorded courses separately: for example 100 introductions at 100 MB each add just 10 GB. Lesson recordings will dominate.

Vimeo's current Starter/Standard/Advanced comparison lists 2/4/7 TB storage. Standard is the first of those tiers listed as supporting direct file links from the API; Starter does not meet the current student-download requirement. [Plan comparison](https://help.vimeo.com/hc/en-us/articles/12425432033937-About-Vimeo-plans), [API download requirements](https://help.vimeo.com/hc/en-us/articles/12427806914577-About-video-file-download-links-from-the-API)

On those allowances, 50 sessions/week with 12-month retention fits a 4 TB Standard storage budget; 100/week with 12-month retention approaches a 7 TB Advanced budget; 200/week with 12-month retention needs custom capacity or a shorter actual retention period. These are storage matches only, not an unconditional purchase recommendation.

Account-specific terms matter: older accounts can have video-count allowances. Vimeo is also rolling out Core, whose documentation distinguishes 7 TB total storage from **300 GB managed storage for embedded/non-public videos**. Our private lesson library falls into the latter use case. Confirm the actual private/embedded allowance and API download entitlement in the account offer before changing plans. [Legacy allowance types](https://help.vimeo.com/hc/en-us/articles/26238558836881-What-is-the-difference-between-upload-quota-video-usage-and-total-storage), [Core plan](https://help.vimeo.com/hc/en-us/articles/49786876885137-About-the-Vimeo-Core-plan)

Viewing and downloading also consume bandwidth. Vimeo documents a **2 TB/month threshold** on self-service plans; increasing from Standard to Advanced does not increase that threshold. Sustained excess can require a custom agreement. [Vimeo bandwidth policy](https://help.vimeo.com/hc/en-us/articles/12426275404305-Bandwidth-on-Vimeo)

Example: 100 group sessions/week × 4 students × 2 full replays × 0.75 GB delivered per replay × 52/12 weeks/month ≈ **2.6 TB/month**, before downloads or older courses. The 0.75 GB is an assumption; adaptive streaming changes delivered bytes. This is why a school can need custom bandwidth before filling its video storage.

For the non-video cloud, calculate documents/photos separately: 100 teachers × 2 MB/photo = 0.2 GB; 10,000 documents × 3 MB = 30 GB. Database backups and any independent video archive are separate budgets. Actual weekly lesson volume and retention will determine the final plan; no course-duration or deletion rule has been assumed as a business decision.
