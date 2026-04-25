-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('FAMILY', 'YOUTH', 'MIXED', 'BUSINESS', 'OTHER');

-- CreateEnum
CREATE TYPE "SeatingPreference" AS ENUM ('INDOOR', 'OUTDOOR', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('STANDARD', 'EVENT_NIGHT', 'VIP', 'OCCASION', 'OTHER');

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'HELD';
ALTER TYPE "ReservationStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_table_id_fkey";

-- AlterTable: preserve previous customer free-text as special_request
ALTER TABLE "reservations" RENAME COLUMN "customer_note" TO "special_request";

ALTER TABLE "reservations" ADD COLUMN "guest_type" "GuestType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "reservations" ADD COLUMN "seating_preference" "SeatingPreference" NOT NULL DEFAULT 'NO_PREFERENCE';
ALTER TABLE "reservations" ADD COLUMN "booking_type" "BookingType" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "reservations" ADD COLUMN "occasion_note" TEXT;
ALTER TABLE "reservations" ADD COLUMN "customer_phone" TEXT;

ALTER TABLE "reservations" ALTER COLUMN "guest_type" DROP DEFAULT;
ALTER TABLE "reservations" ALTER COLUMN "seating_preference" DROP DEFAULT;
ALTER TABLE "reservations" ALTER COLUMN "booking_type" DROP DEFAULT;

ALTER TABLE "reservations" ALTER COLUMN "table_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
