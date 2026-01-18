-- ============================================
-- SUPABASE STORAGE SETUP FOR COURSE IMAGES
-- Run this in Supabase SQL Editor
-- ============================================

-- Create the course-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-images');

-- Policy: Allow admins and editors to upload images
CREATE POLICY "Admins can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-images' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Policy: Allow admins and editors to update images
CREATE POLICY "Admins can update course images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-images' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Policy: Allow admins and editors to delete images
CREATE POLICY "Admins can delete course images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-images' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Policy: Allow public read access to course images
CREATE POLICY "Public can view course images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course-images');
