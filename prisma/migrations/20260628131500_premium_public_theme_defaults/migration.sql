ALTER TABLE "website_themes"
  ALTER COLUMN "primary_color" SET DEFAULT '#00A6B4',
  ALTER COLUMN "secondary_color" SET DEFAULT '#064E5F',
  ALTER COLUMN "accent_color" SET DEFAULT '#F6C85F',
  ALTER COLUMN "background_color" SET DEFAULT '#F8FAF9',
  ALTER COLUMN "text_color" SET DEFAULT '#263238',
  ALTER COLUMN "text_muted_color" SET DEFAULT '#6B7280',
  ALTER COLUMN "button_color" SET DEFAULT '#00A6B4',
  ALTER COLUMN "button_text_color" SET DEFAULT '#FFFFFF',
  ALTER COLUMN "header_bg_color" SET DEFAULT '#FFFFFF',
  ALTER COLUMN "footer_bg_color" SET DEFAULT '#052F3F';

UPDATE "website_themes"
SET
  "primary_color" = '#00A6B4',
  "secondary_color" = '#064E5F',
  "accent_color" = '#F6C85F',
  "background_color" = '#F8FAF9',
  "text_color" = '#263238',
  "text_muted_color" = '#6B7280',
  "button_color" = '#00A6B4',
  "button_text_color" = '#FFFFFF',
  "header_bg_color" = '#FFFFFF',
  "footer_bg_color" = '#052F3F',
  "config" = COALESCE("config", '{}'::jsonb) || '{
    "sectionBgColor": "#FFFFFF",
    "sectionAltBgColor": "#EEFAF8",
    "cardBgColor": "#FFFFFF",
    "cardBorderColor": "#00A6B4",
    "headingColor": "#083344"
  }'::jsonb
WHERE
  "is_active" = true
  AND "background_color" IN ('#0A0F1A', '#050A10')
  AND "primary_color" IN ('#F5A623', '#FF7B2E');
