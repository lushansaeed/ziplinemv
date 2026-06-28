ALTER TABLE "website_themes"
  ALTER COLUMN "background_color" SET DEFAULT '#c3c3c3';

UPDATE "website_themes"
SET "background_color" = '#c3c3c3'
WHERE
  "is_active" = true
  AND "background_color" IN ('#0A0F1A', '#050A10', '#F8FAF9')
  AND "primary_color" IN ('#F5A623', '#FF7B2E', '#00A6B4');
