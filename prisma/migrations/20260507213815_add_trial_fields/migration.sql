-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN     "watermarkKey" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freeTrialUsed" BOOLEAN NOT NULL DEFAULT false;
