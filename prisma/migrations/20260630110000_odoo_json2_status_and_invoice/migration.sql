CREATE TYPE "OdooSyncStatus_new" AS ENUM ('not_synced', 'syncing', 'synced', 'failed', 'skipped_unpaid');

ALTER TABLE "bookings"
  ALTER COLUMN "odoo_sync_status" DROP DEFAULT;

ALTER TABLE "bookings"
  ALTER COLUMN "odoo_sync_status" TYPE "OdooSyncStatus_new"
  USING (
    CASE "odoo_sync_status"::text
      WHEN 'PENDING' THEN 'not_synced'
      WHEN 'SYNCING' THEN 'syncing'
      WHEN 'SYNCED' THEN 'synced'
      WHEN 'FAILED' THEN 'failed'
      WHEN 'SKIPPED' THEN 'skipped_unpaid'
      ELSE 'not_synced'
    END
  )::"OdooSyncStatus_new";

ALTER TYPE "OdooSyncStatus" RENAME TO "OdooSyncStatus_old";
ALTER TYPE "OdooSyncStatus_new" RENAME TO "OdooSyncStatus";
DROP TYPE "OdooSyncStatus_old";

ALTER TABLE "bookings"
  ALTER COLUMN "odoo_sync_status" SET DEFAULT 'not_synced',
  ADD COLUMN "odoo_invoice_id" INTEGER;

CREATE INDEX "bookings_odoo_invoice_id_idx" ON "bookings"("odoo_invoice_id");
