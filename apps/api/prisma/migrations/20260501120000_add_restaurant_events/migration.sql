-- CreateEnum
CREATE TYPE "RestaurantEventStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "restaurant_events" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "RestaurantEventStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(14,2),
    "currency" VARCHAR(8) NOT NULL DEFAULT 'IQD',
    "capacity" INTEGER,
    "seats_available_note" TEXT,
    "special_menu_description" TEXT,
    "special_menu_url" VARCHAR(2048),
    "what_is_included" TEXT,
    "entertainment_info" TEXT,
    "cover_image_url" VARCHAR(2048),
    "gallery_image_urls" JSONB,
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" UUID,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_events_restaurant_id_idx" ON "restaurant_events"("restaurant_id");

-- CreateIndex
CREATE INDEX "restaurant_events_restaurant_id_status_idx" ON "restaurant_events"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "restaurant_events_starts_at_idx" ON "restaurant_events"("starts_at");

-- AddForeignKey
ALTER TABLE "restaurant_events" ADD CONSTRAINT "restaurant_events_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_events" ADD CONSTRAINT "restaurant_events_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_events" ADD CONSTRAINT "restaurant_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
