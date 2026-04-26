-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'TABLE_RESERVATION_CONFIRMED',
  'TABLE_RESERVATION_REJECTED',
  'TABLE_RESERVATION_CANCELLED',
  'EVENT_RESERVATION_CONFIRMED',
  'EVENT_RESERVATION_REJECTED',
  'EVENT_RESERVATION_CANCELLED'
);

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM (
  'TABLE_RESERVATION',
  'EVENT_RESERVATION',
  'RESTAURANT',
  'EVENT'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" "NotificationEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "restaurant_id" UUID,
    "event_id" UUID,
    "reservation_id" UUID,
    "event_reservation_id" UUID,
    "read_at" TIMESTAMP(3),
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_created_at_idx" ON "notifications"("recipient_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_read_at_idx" ON "notifications"("recipient_user_id", "read_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
