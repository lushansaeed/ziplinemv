ALTER TABLE "ride_tracking"
  ADD COLUMN "launch_line_number" INTEGER;

ALTER TABLE "ride_tracking"
  ADD CONSTRAINT "ride_tracking_launch_line_number_check"
  CHECK ("launch_line_number" IS NULL OR "launch_line_number" IN (1, 2));

