ALTER TABLE "bookings"
ADD COLUMN IF NOT EXISTS "confirmation_email_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "confirmation_email_sent_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "confirmation_email_error" TEXT,
ADD COLUMN IF NOT EXISTS "confirmation_email_recipient" TEXT;
