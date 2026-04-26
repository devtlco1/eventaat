-- CreateEnum
CREATE TYPE "RestaurantContactType" AS ENUM ('PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE', 'EMAIL', 'OTHER');

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "website_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "menu_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "location_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "instagram_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "cover_image_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "profile_image_url" VARCHAR(2048);
ALTER TABLE "restaurants" ADD COLUMN "short_description" TEXT;
ALTER TABLE "restaurants" ADD COLUMN "profile_description" TEXT;

-- CreateTable
CREATE TABLE "restaurant_contacts" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "type" "RestaurantContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_contacts_restaurant_id_idx" ON "restaurant_contacts"("restaurant_id");

-- CreateIndex
CREATE INDEX "restaurant_contacts_restaurant_id_type_idx" ON "restaurant_contacts"("restaurant_id", "type");

-- AddForeignKey
ALTER TABLE "restaurant_contacts" ADD CONSTRAINT "restaurant_contacts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
