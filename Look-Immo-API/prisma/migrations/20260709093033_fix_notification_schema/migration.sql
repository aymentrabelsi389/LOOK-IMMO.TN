-- Migration: fix_notification_schema
-- Fixes the Notification table to:
-- 1. Change the "type" column from the NotificationType enum to plain TEXT
-- 2. Add missing columns: title, icon, link, metadata

-- Step 1: Add new columns if they don't exist yet
ALTER TABLE "Notification"
    ADD COLUMN IF NOT EXISTS "title"    TEXT,
    ADD COLUMN IF NOT EXISTS "icon"     TEXT,
    ADD COLUMN IF NOT EXISTS "link"     TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Step 2: Change "type" column from the enum to TEXT
-- First cast existing enum values to text
ALTER TABLE "Notification"
    ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Step 3: Drop the old NotificationType enum (if it exists and is no longer needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        DROP TYPE "NotificationType";
    END IF;
END$$;

-- Step 4: Add missing indexes if not present (idempotent)
CREATE INDEX IF NOT EXISTS "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
