-- ============================================================
-- Migration: add_missing_fields
-- Adds every column/table that exists in schema.prisma but
-- was never captured in a previous migration file.
-- Safe to run on a database that already has some of these
-- columns — each ALTER TABLE uses IF NOT EXISTS guards,
-- and CREATE TABLE uses IF NOT EXISTS too.
-- ============================================================

-- ── Property: isHotDeal ─────────────────────────────────────
ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "isHotDeal" BOOLEAN NOT NULL DEFAULT false;

-- ── Property: averageRating ─────────────────────────────────
ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- ── Property: ratingsCount ──────────────────────────────────
ALTER TABLE "Property"
    ADD COLUMN IF NOT EXISTS "ratingsCount" INTEGER NOT NULL DEFAULT 0;

-- ── User: password-reset fields ─────────────────────────────
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "resetCodeHash"      TEXT,
    ADD COLUMN IF NOT EXISTS "resetCodeExpiresAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "resetAttempts"      INTEGER NOT NULL DEFAULT 0;

-- ── Message: subject ────────────────────────────────────────
ALTER TABLE "Message"
    ADD COLUMN IF NOT EXISTS "subject" TEXT;

-- ── RefreshToken table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id"        TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "familyId"  TEXT NOT NULL,
    "used"      BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx"   ON "RefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx"    ON "RefreshToken"("token");

ALTER TABLE "RefreshToken"
    DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FinanceTransaction table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
    "id"              TEXT NOT NULL,
    "type"            TEXT NOT NULL,
    "propertyTitle"   TEXT NOT NULL,
    "clientName"      TEXT NOT NULL,
    "date"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission"      DOUBLE PRECISION NOT NULL,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "paymentMode"     TEXT NOT NULL,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinanceTransaction_type_date_idx" ON "FinanceTransaction"("type", "date");

-- ── Property: missing indexes ────────────────────────────────
CREATE INDEX IF NOT EXISTS "Property_isNew_idx"         ON "Property"("isNew");
CREATE INDEX IF NOT EXISTS "Property_isHotDeal_idx"     ON "Property"("isHotDeal");
CREATE INDEX IF NOT EXISTS "Property_displayOrder_idx"  ON "Property"("displayOrder");
CREATE INDEX IF NOT EXISTS "Property_isFeatured_isNew_status_idx"
    ON "Property"("isFeatured", "isNew", "status");
CREATE INDEX IF NOT EXISTS "Property_status_type_price_idx"
    ON "Property"("status", "type", "price");
CREATE INDEX IF NOT EXISTS "Property_status_type_category_city_idx"
    ON "Property"("status", "type", "category", "city");

-- ── Appointment: updatedAt (was missing from initial create) ─
ALTER TABLE "Appointment"
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- Backfill updatedAt for existing rows (set to createdAt)
UPDATE "Appointment" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- ── Appointment: createdAt index ─────────────────────────────
CREATE INDEX IF NOT EXISTS "Appointment_createdAt_idx" ON "Appointment"("createdAt");
