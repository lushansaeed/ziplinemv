DO $$ BEGIN
  CREATE TYPE "CustomerType" AS ENUM ('LOCAL', 'TOURIST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "customer_type" "CustomerType" NOT NULL DEFAULT 'TOURIST',
  ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(10, 4),
  ADD COLUMN IF NOT EXISTS "price_type" TEXT;

