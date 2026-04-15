-- Publish all interactive (learndash) courses so they appear on the public catalog.
-- Reverses the draft set by 20260228000000_publish_ebooks_draft_interactive.sql.

UPDATE courses
SET is_published = true,
    is_draft = false,
    updated_at = NOW()
WHERE product_type = 'learndash';
