UPDATE "add_ons"
SET "price" = 30
WHERE "name" = 'Drone Footage'
  AND "price" = 70;

UPDATE "booking_add_ons" bao
SET
  "quantity" = CASE
    WHEN a."name" = '360° Video' THEN 2
    WHEN a."name" = 'Drone Footage' THEN 2
    WHEN a."name" = 'Photography' THEN 1
    ELSE bao."quantity"
  END,
  "price_per_unit" = CASE
    WHEN a."name" = 'Drone Footage' THEN 30
    ELSE bao."price_per_unit"
  END,
  "total" = CASE
    WHEN a."name" = '360° Video' THEN 20
    WHEN a."name" = 'Drone Footage' THEN 60
    WHEN a."name" = 'Photography' THEN 10
    ELSE bao."total"
  END
FROM "bookings" b, "add_ons" a
WHERE bao."booking_id" = b."id"
  AND bao."add_on_id" = a."id"
  AND b."reference" = 'ZL-MTFUELCL'
  AND a."name" IN ('360° Video', 'Drone Footage', 'Photography');

UPDATE "bookings"
SET
  "subtotal" = 190,
  "total" = 190
WHERE "reference" = 'ZL-MTFUELCL'
  AND "currency" = 'USD';

UPDATE "payments" p
SET "amount" = 190
FROM "bookings" b
WHERE p."booking_id" = b."id"
  AND b."reference" = 'ZL-MTFUELCL'
  AND p."currency" = 'USD';
