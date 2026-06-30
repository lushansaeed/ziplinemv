import { prisma } from "@/lib/prisma/client";

let launchLineColumnPromise: Promise<void> | null = null;

export async function ensureRideTrackingLaunchLineColumn() {
  launchLineColumnPromise ??= (async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ride_tracking"
      ADD COLUMN IF NOT EXISTS "launch_line_number" INTEGER
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        ALTER TABLE "ride_tracking"
        ADD CONSTRAINT "ride_tracking_launch_line_number_check"
        CHECK ("launch_line_number" IS NULL OR "launch_line_number" IN (1, 2));
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  })().catch((error) => {
    launchLineColumnPromise = null;
    console.error("[ride-tracking:schema-guard]", error?.message ?? error);
    throw error;
  });

  return launchLineColumnPromise;
}
