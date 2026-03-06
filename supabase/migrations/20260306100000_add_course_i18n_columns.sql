-- ============================================
-- Add i18n columns for course title & description
-- ============================================
-- English content stays in the original `title` and `description` columns.
-- New columns hold Italian, Serbian, and Spanish translations.
-- NULL = "use the English fallback".

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS title_it       TEXT,
  ADD COLUMN IF NOT EXISTS title_sr       TEXT,
  ADD COLUMN IF NOT EXISTS title_es       TEXT,
  ADD COLUMN IF NOT EXISTS description_it TEXT,
  ADD COLUMN IF NOT EXISTS description_sr TEXT,
  ADD COLUMN IF NOT EXISTS description_es TEXT;

-- Optional: index for future full-text search on translated descriptions
-- CREATE INDEX IF NOT EXISTS idx_courses_title_it ON courses USING gin(to_tsvector('italian', coalesce(title_it, '')));
