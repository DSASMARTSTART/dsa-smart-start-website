-- Language Lab Pro includes materials in its published package price.
-- Remove the stale optional surcharge; preserve prices, purchases and access.
BEGIN;
UPDATE public.courses SET teaching_materials_price=NULL,updated_at=now()
WHERE level='language-lab-pro' AND teaching_materials_included
 AND teaching_materials_price IS NOT NULL;
COMMIT;
