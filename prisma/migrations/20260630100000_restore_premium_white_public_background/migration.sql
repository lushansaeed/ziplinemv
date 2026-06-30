ALTER TABLE "website_themes"
  ALTER COLUMN "background_color" SET DEFAULT '#F8FAF9';

UPDATE "website_themes"
SET
  "background_color" = '#F8FAF9',
  "config" = COALESCE("config", '{}'::jsonb) || '{
    "backgroundColor": "#F8FAF9",
    "sectionBgColor": "#FFFFFF",
    "sectionAltBgColor": "#EEFAF8",
    "cardBgColor": "#FFFFFF"
  }'::jsonb
WHERE
  "is_active" = true
  AND "background_color" = '#c3c3c3';

UPDATE "website_backgrounds"
SET "solid_color" = '#F8FAF9'
WHERE
  "is_active" = true
  AND "background_type" = 'solid'
  AND "solid_color" = '#c3c3c3';
