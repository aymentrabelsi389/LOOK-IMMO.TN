-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('total', 'per_m2');

-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Actualités';

-- AlterTable
CREATE SEQUENCE property_displayorder_seq;
ALTER TABLE "Property" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "priceType" "PriceType" DEFAULT 'total',
ALTER COLUMN "displayOrder" SET DEFAULT nextval('property_displayorder_seq');
ALTER SEQUENCE property_displayorder_seq OWNED BY "Property"."displayOrder";

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLogin" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
