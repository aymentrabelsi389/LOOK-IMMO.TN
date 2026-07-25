-- Migration: add_owner_phone
-- Adds the ownerPhone column to the Property table

ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "ownerPhone" TEXT;
