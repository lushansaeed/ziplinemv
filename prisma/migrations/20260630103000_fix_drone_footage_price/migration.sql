UPDATE "add_ons"
SET "price" = 70
WHERE "name" = 'Drone Footage'
  AND "price" = 30;

UPDATE "booking_add_ons" bao
SET
  "price_per_unit" = 70,
  "total" = bao."quantity" * 70
FROM "bookings" b, "add_ons" a
WHERE bao."booking_id" = b."id"
  AND bao."add_on_id" = a."id"
  AND b."reference" = 'ZL-MTFUELCL'
  AND a."name" = 'Drone Footage'
  AND bao."price_per_unit" = 30;

UPDATE "bookings"
SET
  "subtotal" = 190,
  "total" = 190
WHERE "reference" = 'ZL-MTFUELCL'
  AND "currency" = 'USD'
  AND "subtotal" = 150
  AND "total" = 150;

UPDATE "payments" p
SET "amount" = 190
FROM "bookings" b
WHERE p."booking_id" = b."id"
  AND b."reference" = 'ZL-MTFUELCL'
  AND p."amount" = 150
  AND p."currency" = 'USD';
