CREATE TYPE "OdooSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SKIPPED', 'SYNCED', 'FAILED');

ALTER TABLE "bookings"
ADD COLUMN "odoo_sync_status" "OdooSyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "odoo_sale_order_id" INTEGER,
ADD COLUMN "odoo_synced_at" TIMESTAMP(3),
ADD COLUMN "odoo_sync_error" TEXT;

CREATE INDEX "bookings_odoo_sync_status_created_at_idx" ON "bookings"("odoo_sync_status", "created_at");
CREATE INDEX "bookings_odoo_sale_order_id_idx" ON "bookings"("odoo_sale_order_id");
