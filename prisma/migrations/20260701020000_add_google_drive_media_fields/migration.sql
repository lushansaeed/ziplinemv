DO $$
BEGIN
  CREATE TYPE "MediaFolderStatus" AS ENUM (
    'PENDING_UPLOAD',
    'PARTIALLY_UPLOADED',
    'UPLOADED',
    'ISSUE_REPORTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "drive_folder_id" TEXT,
  ADD COLUMN IF NOT EXISTS "drive_folder_url" TEXT,
  ADD COLUMN IF NOT EXISTS "drive_folder_created_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "media_link_email_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "media_folder_status" "MediaFolderStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  ADD COLUMN IF NOT EXISTS "media_uploaded_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "bookings_media_folder_status_booking_status_idx"
  ON "bookings" ("media_folder_status", "booking_status");

CREATE INDEX IF NOT EXISTS "bookings_media_link_email_sent_at_idx"
  ON "bookings" ("media_link_email_sent_at");
