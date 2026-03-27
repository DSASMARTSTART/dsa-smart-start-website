-- Add ebook_files JSONB column to support multiple downloadable files per e-book
-- Each entry: { "label": "E-book PDF", "url": "https://drive.google.com/..." }

ALTER TABLE courses ADD COLUMN IF NOT EXISTS ebook_files JSONB DEFAULT '[]'::jsonb;

-- Migrate existing ebook_pdf_url values into ebook_files array
UPDATE courses
SET ebook_files = jsonb_build_array(
  jsonb_build_object('label', 'E-book PDF', 'url', ebook_pdf_url)
)
WHERE ebook_pdf_url IS NOT NULL
  AND ebook_pdf_url != ''
  AND ebook_pdf_url != 'pending-upload'
  AND (ebook_files IS NULL OR ebook_files = '[]'::jsonb);
