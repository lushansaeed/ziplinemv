CREATE TYPE "BookingSource" AS ENUM ('DIRECT_BOOKING', 'WALK_IN', 'AGENT', 'AFFILIATE');

ALTER TABLE "Customer"
  ADD COLUMN "source" "BookingSource" NOT NULL DEFAULT 'DIRECT_BOOKING',
  ADD COLUMN "agentId" TEXT,
  ADD COLUMN "affiliateId" TEXT,
  ADD COLUMN "affiliateCodeId" TEXT;

ALTER TABLE "Booking"
  ADD COLUMN "source" "BookingSource" NOT NULL DEFAULT 'DIRECT_BOOKING';

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Customer_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Customer_affiliateCodeId_fkey" FOREIGN KEY ("affiliateCodeId") REFERENCES "AffiliateCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Customer_source_idx" ON "Customer"("source");
CREATE INDEX "Customer_agentId_idx" ON "Customer"("agentId");
CREATE INDEX "Customer_affiliateId_idx" ON "Customer"("affiliateId");
CREATE INDEX "Booking_source_idx" ON "Booking"("source");
