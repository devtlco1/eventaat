-- CreateEnum
CREATE TYPE "EventReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "event_reservations" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "party_size" INTEGER NOT NULL,
    "status" "EventReservationStatus" NOT NULL DEFAULT 'PENDING',
    "special_request" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reservation_status_history" (
    "id" UUID NOT NULL,
    "event_reservation_id" UUID NOT NULL,
    "changed_by_user_id" UUID,
    "from_status" "EventReservationStatus",
    "to_status" "EventReservationStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reservation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_reservations_event_id_status_idx" ON "event_reservations"("event_id", "status");

-- CreateIndex
CREATE INDEX "event_reservations_restaurant_id_status_idx" ON "event_reservations"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "event_reservations_customer_id_idx" ON "event_reservations"("customer_id");

-- CreateIndex
CREATE INDEX "event_reservation_status_history_event_reservation_id_idx" ON "event_reservation_status_history"("event_reservation_id");

-- CreateIndex
CREATE INDEX "event_reservation_status_history_event_reservation_id_created_at_idx" ON "event_reservation_status_history"("event_reservation_id", "created_at");

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservations" ADD CONSTRAINT "event_reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "restaurant_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservation_status_history" ADD CONSTRAINT "event_reservation_status_history_event_reservation_id_fkey" FOREIGN KEY ("event_reservation_id") REFERENCES "event_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reservation_status_history" ADD CONSTRAINT "event_reservation_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
