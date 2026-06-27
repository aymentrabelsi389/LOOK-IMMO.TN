-- Add display_order column
ALTER TABLE "Property"
ADD COLUMN "displayOrder" INTEGER;
-- Set initial values based on creation order (oldest = 1, newest = max)
WITH ranked AS (
    SELECT id,
        ROW_NUMBER() OVER (
            ORDER BY "createdAt" ASC
        ) as rn
    FROM "Property"
)
UPDATE "Property" p
SET "displayOrder" = r.rn
FROM ranked r
WHERE p.id = r.id;
-- Make it NOT NULL after setting values
ALTER TABLE "Property"
ALTER COLUMN "displayOrder"
SET NOT NULL;
-- Set default for future inserts
ALTER TABLE "Property"
ALTER COLUMN "displayOrder"
SET DEFAULT 1;