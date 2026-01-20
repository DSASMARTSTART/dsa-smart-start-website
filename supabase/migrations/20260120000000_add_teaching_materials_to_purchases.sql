-- Add teaching materials tracking columns to purchases table
-- This allows us to track when users purchased teaching materials add-on

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS include_teaching_materials BOOLEAN DEFAULT FALSE;

ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS teaching_materials_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN purchases.include_teaching_materials IS 'Whether the user purchased teaching materials add-on with this course';
COMMENT ON COLUMN purchases.teaching_materials_amount IS 'The amount paid for teaching materials (typically €50)';

-- Create index for queries filtering by teaching materials
CREATE INDEX IF NOT EXISTS idx_purchases_teaching_materials 
ON purchases(include_teaching_materials) 
WHERE include_teaching_materials = TRUE;
