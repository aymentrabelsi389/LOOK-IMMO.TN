-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "category" TEXT DEFAULT 'apartment',
ADD COLUMN     "features" JSONB,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false;
