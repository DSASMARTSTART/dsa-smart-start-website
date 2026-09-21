# Booking acceptance check — 21 September 2026

## Result

The implemented booking path passed automated checks and a manual production browser check. This is not a claim that payment delivery, teacher invitation delivery or Vimeo playback have passed an end-to-end acceptance test.

Application and database fixes are published. No paid access, existing reservations or commercial policy settings were changed by this audit.

## Changes made

- Attendance/no-show can be recorded only after the lesson ends, both in the UI and in the database.
- A teacher's required break is the largest break configured among their assigned programs. Private availability, cross-package bookings and new group scheduling enforce that same gap. Private slot spacing includes the break.
- Nonexistent spring daylight-saving times are skipped without breaking the full day's availability.
- Students see the configured minimum notice and cancellation policy before confirming a reservation; exhausted credits disable confirmation.
- A missing meeting URL has an explicit pending message. A missed private lesson does not require a recording.
- Admin access waits for the authenticated profile. A stale response cannot restore a profile after logout; paused admins cannot pass the frontend access check.
- Deleted legacy profiles are retained in Users but excluded from actionable missing-login counts.

## Account investigation

Two legacy seed profiles are already marked deleted, have student roles, no authentication records, no purchases and no enrollments. They are archived history, not active broken accounts. They were not deleted or reactivated.

One remaining active legacy test profile and one authentication record share the same email but have different IDs. The auth record is unconfirmed and has never signed in. The profile has no purchases or enrollments. They were not automatically merged or granted access based on an unverified email address. The owner must decide whether to retain that test account and confirm ownership before any identity migration. Existing foreign keys do not cascade user ID updates; a future repair must migrate references transactionally rather than blindly changing the ID.

The demo teacher intentionally has no authentication account. Real teacher onboarding still needs its invitation/login acceptance test.

## Tests performed

- `npm test`: 88 tests pass, including new delayed-profile/logout/paused-admin checks, booking credit exhaustion, cancellation copy, ongoing-lesson controls and private no-show recording requirements.
- `npm run test:live-db`: disposable Postgres tests pass. Coverage includes ordinary student/teacher/admin permissions, private slot races, group capacity races, concurrent credit usage, stale teacher edits, booked calendar protection, cancellation cutoff and idempotency, no-show credits, cross-program breaks, material entitlements, recording expiry/revoked access, analytics authorization and currency/refund accounting. These fixtures are not inserted into production.
- `npm run build`: passes. Changed frontend files pass targeted ESLint. `git diff --check` passes.
- Full-repository `tsc --noEmit` still fails on existing errors in other admin/checkout components, seed data and Deno functions included in the frontend compiler scope. There are no diagnostics in the changed booking/auth files. This remains a separate release-quality issue; the build succeeding does not mean the full type check passes.
- Production migration readback confirms both `20260921200000` and `20260921210000` and the lesson-end guard.
- Manual browser: existing Hybrid dashboard → selected demo teacher → Friday 25 September, 09:00 Europe/Belgrade → select slot without reserving → explicit confirmation → success → slot disappears → private credits 4 to 3 → dashboard shows two booked lessons → admin sees the new reservation → cancel the new reservation → database confirms cancelled/credit unused, original reservation unchanged, private credits restored to 4. The manual actor was the existing admin in student view; ordinary-student authorization was tested separately in disposable database tests.
- The cancelled QA reservation is retained as history (`ce414e3e-1cf9-4e23-9c19-86053bc4ab5c`). No real purchase was charged and no invitation or email was sent.
- Admin package materials lists the four existing live programs with the correct entitlement messaging. No production learning content was uploaded during this audit; upload UI and database permission cases passed automated tests.

## Proposed business rules — not activated

- Book at least 12 hours ahead.
- Cancel/reschedule at least 24 hours ahead for a returned credit. A booking made inside that cutoff should show an explicit non-refundable-credit warning before confirmation.
- A late student cancellation or no-show consumes the credit. Teacher cancellation returns it. Keep an admin exception path for genuine technical problems or emergencies.
- Ten-minute teacher breaks; four seats per group to start; 30-minute private and 50-minute group lessons.
- Students cannot silently move an existing reservation. Rescheduling must account for the cancellation rule and confirm a new available slot.

Current production settings remain 60-minute notice, zero buffer, four default group seats, 90-day recording access and student online cancellation disabled. Staff can cancel and return a credit. A dedicated late-cancellation action that records cancellation while retaining the credit is not implemented; the current late student request is referred to the teacher. Activating the proposed policy requires that behavior and its explanation to be implemented consistently, not just editing the cutoff number.

## Still requiring acceptance before declaring the entire service ready

1. Choose the commercial rules and apply the agreed behavior, including late cancellations.
2. Add `VIMEO_ACCESS_TOKEN`; its absence was verified by secret-name inventory. Then test an actual teacher/admin upload, processing, authorized student playback and expired/revoked access with the provider.
3. Add a real teacher, confirm invitation delivery, set a password, edit their own schedule and verify access isolation in a real authenticated browser session.
4. Verify a real payment provider completion/cancellation and invoice/email delivery. No money was charged by this audit.
5. Booking confirmation emails and timed reminders are not implemented in the current booking RPC path. Decide delivery channels/timing before promising those notifications to customers.
