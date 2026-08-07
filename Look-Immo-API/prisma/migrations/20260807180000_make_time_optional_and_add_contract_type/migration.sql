-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "time" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ClientDemand" ADD COLUMN "contractType" "PropertyType" NOT NULL DEFAULT 'sale';
