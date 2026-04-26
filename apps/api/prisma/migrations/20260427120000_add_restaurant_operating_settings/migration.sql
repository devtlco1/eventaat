-- CreateTable
CREATE TABLE "restaurant_operating_settings" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "default_reservation_duration_minutes" INTEGER NOT NULL DEFAULT 90,
    "min_party_size" INTEGER NOT NULL DEFAULT 1,
    "max_party_size" INTEGER,
    "manual_approval_required" BOOLEAN NOT NULL DEFAULT true,
    "accepts_reservations" BOOLEAN NOT NULL DEFAULT true,
    "advance_booking_days" INTEGER NOT NULL DEFAULT 14,
    "same_day_cutoff_minutes" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_operating_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_operating_settings_restaurant_id_key" ON "restaurant_operating_settings"("restaurant_id");

ALTER TABLE "restaurant_operating_settings" ADD CONSTRAINT "restaurant_operating_settings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "restaurant_opening_hours" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "opens_at" TEXT NOT NULL,
    "closes_at" TEXT NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_opening_hours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "restaurant_opening_hours_restaurant_id_day_of_week_key" ON "restaurant_opening_hours"("restaurant_id", "day_of_week");
CREATE INDEX "restaurant_opening_hours_restaurant_id_idx" ON "restaurant_opening_hours"("restaurant_id");

ALTER TABLE "restaurant_opening_hours" ADD CONSTRAINT "restaurant_opening_hours_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill defaults for every existing restaurant
INSERT INTO "restaurant_operating_settings" (
  "id",
  "restaurant_id",
  "default_reservation_duration_minutes",
  "min_party_size",
  "max_party_size",
  "manual_approval_required",
  "accepts_reservations",
  "advance_booking_days",
  "same_day_cutoff_minutes",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  r."id",
  90,
  1,
  NULL,
  true,
  true,
  14,
  60,
  NOW(),
  NOW()
FROM "restaurants" r;

-- Seven rows per restaurant: open 12:00–23:00, not closed
INSERT INTO "restaurant_opening_hours" (
  "id",
  "restaurant_id",
  "day_of_week",
  "opens_at",
  "closes_at",
  "is_closed",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  r."id",
  s.dow,
  '12:00',
  '23:00',
  false,
  NOW(),
  NOW()
FROM "restaurants" r
CROSS JOIN (SELECT generate_series(0, 6) AS dow) s;
