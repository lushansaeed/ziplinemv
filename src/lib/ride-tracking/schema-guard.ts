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

export function isMissingLaunchLineColumnError(error: unknown) {
  const err = error as { code?: string; meta?: { column?: string }; message?: string };
  const column = err.meta?.column ?? err.message ?? "";
  return err.code === "P2022" && column.includes("launch_line_number");
}

export async function withRideTrackingLaunchLineGuard<T>(operation: () => Promise<T>) {
  await ensureRideTrackingLaunchLineColumn();
  try {
    return await operation();
  } catch (error) {
    if (!isMissingLaunchLineColumnError(error)) throw error;

    launchLineColumnPromise = null;
    await ensureRideTrackingLaunchLineColumn();
    return operation();
  }
}
