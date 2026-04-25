-- CreateTable
CREATE TABLE "reservation_status_history" (
    "id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "changed_by_user_id" UUID,
    "from_status" "ReservationStatus",
    "to_status" "ReservationStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_status_history_reservation_id_idx" ON "reservation_status_history"("reservation_id");

-- CreateIndex
CREATE INDEX "reservation_status_history_reservation_id_created_at_idx" ON "reservation_status_history"("reservation_id", "created_at");

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_status_history" ADD CONSTRAINT "reservation_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one history row per existing reservation
INSERT INTO "reservation_status_history" ("id", "reservation_id", "changed_by_user_id", "from_status", "to_status", "note", "created_at")
SELECT gen_random_uuid(), r."id", NULL, NULL, r."status", 'Existing reservation (migrated)', r."created_at"
FROM "reservations" r;
