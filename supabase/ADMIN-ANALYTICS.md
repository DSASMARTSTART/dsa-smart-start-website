# Admin analytics

`Admin → Dashboard` reads `admin_analytics_snapshot` and `admin_analytics_people` from the linked database. The reports require an active administrator. Students, teachers and editors cannot use these RPCs. The underlying reporting views have no anonymous or authenticated client SELECT grants.

## Scope and definitions

- **Student accounts** are authentication accounts with a student profile, excluding linked teacher accounts. Orphaned legacy profiles are shown in Data checks, not counted as successful registrations.
- **New registrations** use Auth account creation time. A created account does not imply email confirmation, sign-in, payment or a lesson completed. Guest checkout account creation is included and labelled in the people table.
- **Active learners** have a latest sign-in or saved learning/booking action during the reporting period. The profile's enabled/active status is not an activity metric.
- **Periods** are 7/30/90 calendar days in Europe/Belgrade, including the current partial day. Comparison is the preceding complete period. Browser-displayed timestamps use the viewer's locale; the aggregation timezone is shown in the report.
- **Revenue** includes completed/refunded order records purchased in the period, less their current refunded amount. Pending/failed records do not contribute. Refunds are attributed to the original purchase cohort, not their processing date. These are order records, not a bank-settlement ledger.
- **Currencies** are separate. The initial currency is the most common completed/refunded order currency, or EUR when no order exists. No implicit exchange rate is applied.
- **New-account journey** evaluates accounts created in the selected period as of report time. Stages are independent: guest purchases may precede sign-in. Paying accounts require a positive order balance after refunds, in any currency.
- **Interactive progress** is the average proportion of current lesson/homework IDs marked complete for active enrolled students. Deleted item IDs are excluded. Live packages and e-books show no artificial completion percentage.
- **Live sessions** use lesson dates. A shared group counts once; participant attendance, cancellation and no-show counts are separate. No elapsed-time inference marks a lesson attended. Staff/test bookings are included if present and the UI says so.
- **Missing recordings** count ended attended/unconfirmed sessions without a ready/processing recording, deduplicated by group. A private no-show does not require a recording.
- **Current checks** (profiles, access, teacher schedules, upload queues, unmatched payment notifications) are independent of the period filter. They are review queues; deliberately revoked access and demo teachers can appear. No automatic profile deletion or access restoration is performed.

## Coverage

The dashboard reports existing operational records. It does not collect anonymous page views, marketing attribution, devices, session duration, or video watch time. Those measurements are labelled unavailable rather than fabricated as zeros. Latest sign-in is not a historical login-event log; progress can change when completion is undone.

Vimeo metadata and configured email handlers are not evidence of successful real uploads/playback or email delivery. Those still require an acceptance test after the Vimeo key is added and a real teacher is ready to receive an invitation.

## Operations

The server aggregates across database rows, rather than a client-side first-1000-row fetch. Daily charts include zero days. Reports refresh every minute while visible, have explicit error/retry states, and display server generation time. Registrations are searchable and paginated (25 rows). View student links to the existing user detail modal. That modal now uses `admin_user_metrics` for actual item completion, Live attendance, sign-in metadata and net spend separated by currency. Individual user metrics retain the existing active admin/editor access rules; platform-wide account and revenue reporting remains admin-only. Product CSV exports carry reporting period/currency and neutralize spreadsheet formulas in text fields.

Verification: `npm test`, `npm run test:live-db`, `npm run build`. The disposable database suite checks role isolation, reporting-view privacy, date ranges, currencies/refunds, registration cohorts, removed learning items, group-session deduplication and no-show recording rules. Full-repository TypeScript checking still has unrelated pre-existing errors; it is not a passing release check for this repository.
