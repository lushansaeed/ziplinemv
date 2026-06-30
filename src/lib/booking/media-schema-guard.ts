import { prisma } from "@/lib/prisma/client";

let mediaColumnsPromise: Promise<void> | null = null;

export async function ensureBookingMediaColumns() {
  mediaColumnsPromise ??= (async () => {
    await prisma.$executeRawUnsafe(`
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
      END $$
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "drive_folder_id" TEXT,
        ADD COLUMN IF NOT EXISTS "drive_folder_url" TEXT,
        ADD COLUMN IF NOT EXISTS "drive_folder_created_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "media_link_email_sent_at" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "media_folder_status" "MediaFolderStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
        ADD COLUMN IF NOT EXISTS "media_uploaded_at" TIMESTAMP(3)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "bookings_media_folder_status_booking_status_idx"
      ON "bookings" ("media_folder_status", "booking_status")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "bookings_media_link_email_sent_at_idx"
      ON "bookings" ("media_link_email_sent_at")
    `);
  })().catch((error) => {
    mediaColumnsPromise = null;
    console.error("[booking-media:schema-guard]", error?.message ?? error);
    throw error;
  });

  return mediaColumnsPromise;
}

export function isMissingBookingMediaColumnError(error: unknown) {
  const err = error as { code?: string; meta?: { column?: string }; message?: string };
  const column = err.meta?.column ?? err.message ?? "";
  return err.code === "P2022" && (
    column.includes("drive_folder_id")
    || column.includes("drive_folder_url")
    || column.includes("drive_folder_created_at")
    || column.includes("media_link_email_sent_at")
    || column.includes("media_folder_status")
    || column.includes("media_uploaded_at")
  );
}

export async function withBookingMediaColumnsGuard<T>(operation: () => Promise<T>) {
  await ensureBookingMediaColumns();
  try {
    return await operation();
  } catch (error) {
    if (!isMissingBookingMediaColumnError(error)) throw error;

    mediaColumnsPromise = null;
    await ensureBookingMediaColumns();
    return operation();
  }
}
