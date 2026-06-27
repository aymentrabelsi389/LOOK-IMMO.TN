/*
  Warnings:

  - You are about to drop the `Contract` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('facebook', 'instagram', 'tiktok', 'website', 'whatsapp', 'other');

-- CreateEnum
CREATE TYPE "AppointmentMeetingType" AS ENUM ('visite', 'appel', 'reunion');

-- CreateEnum
CREATE TYPE "DemandPropertyType" AS ENUM ('appartement', 'villa', 'terrain', 'bureau', 'commerce');

-- CreateEnum
CREATE TYPE "DemandPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('searching', 'contacted', 'matched', 'closed');

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_userId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "meetingType" "AppointmentMeetingType" NOT NULL DEFAULT 'visite',
ADD COLUMN     "source" "AppointmentSource" NOT NULL DEFAULT 'other',
ALTER COLUMN "clientEmail" DROP NOT NULL,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- DropTable
DROP TABLE "Contract";

-- DropEnum
DROP TYPE "ContractType";

-- CreateTable
CREATE TABLE "WebsiteVisit" (
    "id" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDemand" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "DemandPropertyType" NOT NULL,
    "budget" DOUBLE PRECISION,
    "priority" "DemandPriority" NOT NULL DEFAULT 'medium',
    "status" "DemandStatus" NOT NULL DEFAULT 'searching',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ignoredPropertyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ClientDemand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteVisit_createdAt_idx" ON "WebsiteVisit"("createdAt");

-- CreateIndex
CREATE INDEX "ClientDemand_status_idx" ON "ClientDemand"("status");

-- CreateIndex
CREATE INDEX "ClientDemand_type_idx" ON "ClientDemand"("type");

-- CreateIndex
CREATE INDEX "ClientDemand_location_idx" ON "ClientDemand"("location");

-- CreateIndex
CREATE INDEX "Appointment_status_date_idx" ON "Appointment"("status", "date");

-- CreateIndex
CREATE INDEX "Appointment_propertyId_idx" ON "Appointment"("propertyId");

-- CreateIndex
CREATE INDEX "Blog_published_createdAt_idx" ON "Blog"("published", "createdAt");

-- CreateIndex
CREATE INDEX "Blog_category_idx" ON "Blog"("category");

-- CreateIndex
CREATE INDEX "Blog_createdAt_idx" ON "Blog"("createdAt");

-- CreateIndex
CREATE INDEX "Blog_updatedAt_idx" ON "Blog"("updatedAt");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_propertyId_idx" ON "Favorite"("propertyId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_createdAt_idx" ON "Location"("createdAt");

-- CreateIndex
CREATE INDEX "Message_status_createdAt_idx" ON "Message"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Property_status_type_createdAt_idx" ON "Property"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Property_city_status_idx" ON "Property"("city", "status");

-- CreateIndex
CREATE INDEX "Property_isFeatured_displayOrder_idx" ON "Property"("isFeatured", "displayOrder");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_category_idx" ON "Property"("category");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_city_idx" ON "Property"("city");

-- CreateIndex
CREATE INDEX "Property_isFeatured_idx" ON "Property"("isFeatured");

-- CreateIndex
CREATE INDEX "Property_createdAt_idx" ON "Property"("createdAt");

-- CreateIndex
CREATE INDEX "Property_updatedAt_idx" ON "Property"("updatedAt");

-- CreateIndex
CREATE INDEX "Rating_propertyId_idx" ON "Rating"("propertyId");

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
