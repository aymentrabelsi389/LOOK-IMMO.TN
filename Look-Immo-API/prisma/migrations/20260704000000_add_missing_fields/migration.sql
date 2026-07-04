-- ── Property: isHotDeal, averageRating, ratingsCount ────────────────────────
ALTER TABLE "Property"
    ADD COLUMN "isHotDeal"     BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN "ratingsCount"  INTEGER          NOT NULL DEFAULT 0;

-- ── User: password-reset fields ──────────────────────────────────────────────
ALTER TABLE "User"
    ADD COLUMN "resetCodeHash"      TEXT,
    ADD COLUMN "resetCodeExpiresAt" TIMESTAMP(3),
    ADD COLUMN "resetAttempts"      INTEGER NOT NULL DEFAULT 0;

-- ── Message: optional subject line ───────────────────────────────────────────
ALTER TABLE "Message"
    ADD COLUMN "subject" TEXT;

-- ── Appointment: updatedAt (missing from original CREATE TABLE) ───────────────
ALTER TABLE "Appointment"
    ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill updatedAt so NOT NULL constraint can be added safely later
UPDATE "Appointment" SET "updatedAt" = "createdAt";

-- ── RefreshToken table ────────────────────────────────────────────────────────
CREATE TABLE "RefreshToken" (
    "id"        TEXT         NOT NULL,
    "token"     TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "familyId"  TEXT         NOT NULL,
    "used"      BOOLEAN      NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_token_key"    ON "RefreshToken"("token");
CREATE INDEX        "RefreshToken_userId_idx"   ON "RefreshToken"("userId");
CREATE INDEX        "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX        "RefreshToken_token_idx"    ON "RefreshToken"("token");

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;

-- ── FinanceTransaction table ──────────────────────────────────────────────────
CREATE TABLE "FinanceTransaction" (
    "id"              TEXT             NOT NULL,
    "type"            TEXT             NOT NULL,
    "propertyTitle"   TEXT             NOT NULL,
    "clientName"      TEXT             NOT NULL,
    "date"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission"      DOUBLE PRECISION NOT NULL,
    "paymentReceived" BOOLEAN          NOT NULL DEFAULT false,
    "paymentMode"     TEXT             NOT NULL,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceTransaction_type_date_idx" ON "FinanceTransaction"("type", "date");

-- ── Property: missing indexes ─────────────────────────────────────────────────
CREATE INDEX "Property_isNew_idx"                     ON "Property"("isNew");
CREATE INDEX "Property_isHotDeal_idx"                 ON "Property"("isHotDeal");
CREATE INDEX "Property_displayOrder_idx"              ON "Property"("displayOrder");
CREATE INDEX "Property_isFeatured_isNew_status_idx"   ON "Property"("isFeatured", "isNew", "status");
CREATE INDEX "Property_status_type_price_idx"         ON "Property"("status", "type", "price");
CREATE INDEX "Property_status_type_category_city_idx" ON "Property"("status", "type", "category", "city");
CREATE INDEX "Appointment_createdAt_idx"              ON "Appointment"("createdAt");
