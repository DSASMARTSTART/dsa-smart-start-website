-- ============================================
-- PRIVATE E-BOOK STORAGE (audit S2)
-- Date: 2026-07-06
--
-- Paid e-book PDFs were uploaded to the PUBLIC `course-images` bucket and served
-- via getPublicUrl(), so anyone with the URL could download paid content without
-- purchasing. This migration creates a PRIVATE `ebooks` bucket. Downloads are
-- issued as short-lived signed URLs by the `get-ebook-download` edge function,
-- which verifies the caller has an active enrollment (or is an admin/editor)
-- before signing.
--
-- ACTIVATION CHECKLIST (must be done to fully close the hole):
--   1. Apply this migration (creates the private bucket + policies).
--   2. Deploy the get-ebook-download edge function.
--   3. Re-upload / migrate existing e-book PDFs from course-images/ebooks/* into
--      the private `ebooks` bucket, and update courses.ebook_files[].url to the
--      storage PATH (e.g. "a1/a1-beginner.pdf") instead of the public URL.
--   4. Remove the old public copies from course-images/ebooks/*.
-- ============================================

-- Private bucket (public = false → no anonymous getPublicUrl access).
INSERT INTO storage.buckets (id, name, public)
VALUES ('ebooks', 'ebooks', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Reads are performed by the edge function using the service role, which bypasses
-- RLS — but we still add least-privilege policies as defense in depth so that even
-- a leaked anon key cannot list or read the bucket directly.

-- Enrolled users (and admins/editors) may read objects in the ebooks bucket.
-- Path convention: the first path segment is the course id ("<course_id>/<file>").
DROP POLICY IF EXISTS "Enrolled users can read ebooks" ON storage.objects;
CREATE POLICY "Enrolled users can read ebooks" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ebooks'
    AND (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role IN ('admin', 'editor')
      )
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.status = 'active'
          AND e.course_id::text = split_part(storage.objects.name, '/', 1)
      )
    )
  );

-- Only admins/editors may write/replace/delete e-book files.
DROP POLICY IF EXISTS "Admins can manage ebooks" ON storage.objects;
CREATE POLICY "Admins can manage ebooks" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'ebooks'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'ebooks'
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'editor')
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Private ebooks bucket + RLS created. Deploy get-ebook-download and migrate files (see header).';
END $$;
