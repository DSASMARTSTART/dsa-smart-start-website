# Deploy runbook — S2 (private e-book storage) + prices + rate limiting

Run these from the repo root. You need the Supabase CLI (already a dev dep) and your
project's access token + project ref.

## 0. Authenticate & link (one time)

```bash
# Interactive login (opens a browser) …
npx supabase login
# … or set a token non-interactively:
export SUPABASE_ACCESS_TOKEN=sbp_xxx   # from Supabase dashboard → Account → Access Tokens

# Link this repo to your remote project (ref is in the dashboard URL: app.supabase.com/project/<REF>)
npx supabase link --project-ref <YOUR_PROJECT_REF>
```

## 1. Fix the €1 prices

Open the Supabase dashboard → SQL Editor and run, in order:

1. `supabase/diagnose-current-prices.sql` — read-only; confirm which products are at €1.
2. `supabase/restore-real-prices.sql` — edit any prices that differ from your real list, then run it.
   It only touches rows still priced at exactly €1, and is wrapped in BEGIN/COMMIT with a final check.

## 2. Deploy the private e-book storage (S2)

```bash
# a) Apply migrations (creates the private `ebooks` bucket + RLS)
npx supabase db push

# b) Deploy the enrollment-gated signed-URL function
npx supabase functions deploy get-ebook-download
```

`get-ebook-download` requires an authenticated user (default `verify_jwt = true`) — do NOT add it to
the `verify_jwt = false` list in `config.toml`.

### c) Migrate existing e-book files into the private bucket

Existing PDFs live in the PUBLIC `course-images/ebooks/*` and are stored in
`courses.ebook_files[].url` as full public URLs. For each paid e-book:

1. Download the current file from its public URL.
2. Upload it to the private `ebooks` bucket under `"<course_id>/<filename>.pdf"`
   (Storage → ebooks → upload, or `npx supabase storage cp`).
3. Update the DB so the stored value is the **path**, not a public URL:

```sql
-- Example: point a course's e-book file at the private path
UPDATE courses
SET ebook_files = jsonb_build_array(
  jsonb_build_object('label', 'E-book PDF', 'path', '<course_id>/<filename>.pdf')
)
WHERE id = '<course_id>';
```

The dashboard resolver treats any value that is NOT an `http(s)://` URL as a private storage path and
exchanges it for a short-lived signed URL via `get-ebook-download`. External links keep working as-is.

4. Once every file is migrated, delete the public copies from `course-images/ebooks/*`.

## 3. Rate-limit the payment webhook

See the "Rate limiting" section below — this is a platform/edge config, not code.
