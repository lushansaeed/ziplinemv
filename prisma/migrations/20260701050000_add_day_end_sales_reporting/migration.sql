DO $$
BEGIN
  CREATE TYPE "CounterFloatStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DayEndClosingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REOPENED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "collected_amount" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "collected_currency" TEXT,
  ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10, 4),
  ADD COLUMN IF NOT EXISTS "received_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "approved_by_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reason" TEXT;

CREATE INDEX IF NOT EXISTS "payments_collected_currency_method_status_created_at_idx"
  ON "payments" ("collected_currency", "method", "status", "created_at");

CREATE INDEX IF NOT EXISTS "payments_received_by_user_id_created_at_idx"
  ON "payments" ("received_by_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "payment_method_changes" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "previous_method" "PaymentMethod",
  "new_method" "PaymentMethod",
  "previous_status" "PaymentStatus",
  "new_status" "PaymentStatus",
  "changed_by_user_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_method_changes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "payment_method_changes"
    ADD CONSTRAINT "payment_method_changes_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "payment_method_changes_booking_id_created_at_idx"
  ON "payment_method_changes" ("booking_id", "created_at");

CREATE INDEX IF NOT EXISTS "payment_method_changes_changed_by_user_id_created_at_idx"
  ON "payment_method_changes" ("changed_by_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "counter_floats" (
  "id" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'Main Counter',
  "mvr_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "usd_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "effective_date" DATE NOT NULL,
  "status" "CounterFloatStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "counter_floats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "counter_floats_location_status_effective_date_idx"
  ON "counter_floats" ("location", "status", "effective_date");

CREATE INDEX IF NOT EXISTS "counter_floats_effective_date_idx"
  ON "counter_floats" ("effective_date");

CREATE TABLE IF NOT EXISTS "day_end_closings" (
  "id" TEXT NOT NULL,
  "report_date" DATE NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'Main Counter',
  "cashier_id" TEXT,
  "status" "DayEndClosingStatus" NOT NULL DEFAULT 'DRAFT',
  "opening_mvr_float" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "opening_usd_float" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "expected_mvr_cash" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "expected_usd_cash" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "actual_mvr_cash" DECIMAL(10, 2),
  "actual_usd_cash" DECIMAL(10, 2),
  "actual_mvr_card" DECIMAL(10, 2),
  "actual_usd_card" DECIMAL(10, 2),
  "actual_mvr_bank_transfer" DECIMAL(10, 2),
  "actual_usd_bank_transfer" DECIMAL(10, 2),
  "mvr_cash_difference" DECIMAL(10, 2),
  "usd_cash_difference" DECIMAL(10, 2),
  "mvr_card_difference" DECIMAL(10, 2),
  "usd_card_difference" DECIMAL(10, 2),
  "mvr_bank_transfer_difference" DECIMAL(10, 2),
  "usd_bank_transfer_difference" DECIMAL(10, 2),
  "notes" TEXT,
  "submitted_by_user_id" TEXT,
  "submitted_at" TIMESTAMP(3),
  "approved_by_user_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "reopened_by_user_id" TEXT,
  "reopened_at" TIMESTAMP(3),
  "reopen_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "day_end_closings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "day_end_closings_report_date_location_cashier_id_key"
  ON "day_end_closings" ("report_date", "location", "cashier_id");

CREATE INDEX IF NOT EXISTS "day_end_closings_report_date_location_idx"
  ON "day_end_closings" ("report_date", "location");

CREATE INDEX IF NOT EXISTS "day_end_closings_status_report_date_idx"
  ON "day_end_closings" ("status", "report_date");
