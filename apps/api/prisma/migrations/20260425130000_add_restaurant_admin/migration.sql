-- Migration: add_restaurant_admin
-- Creates the restaurant_admins join table that links RESTAURANT_ADMIN users
-- to the restaurants they are permitted to manage.
--
-- Constraints enforced here:
--   • Primary key on (user_id, restaurant_id) — prevents duplicate assignments.
--   • FK to users with CASCADE DELETE — removes assignment when user is deleted.
--   • FK to restaurants with CASCADE DELETE — removes assignment when restaurant is deleted.

CREATE TABLE "restaurant_admins" (
    "user_id"       UUID        NOT NULL,
    "restaurant_id" UUID        NOT NULL,
    "assigned_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "restaurant_admins_pkey" PRIMARY KEY ("user_id", "restaurant_id")
);

ALTER TABLE "restaurant_admins"
    ADD CONSTRAINT "restaurant_admins_user_id_fkey"
        FOREIGN KEY ("user_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_admins"
    ADD CONSTRAINT "restaurant_admins_restaurant_id_fkey"
        FOREIGN KEY ("restaurant_id")
        REFERENCES "restaurants"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
