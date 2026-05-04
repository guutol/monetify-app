-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pixBrCode" TEXT,
ADD COLUMN     "pixBrCodeBase64" TEXT,
ADD COLUMN     "pixExpiresAt" TIMESTAMP(3),
ADD COLUMN     "prompt" TEXT;
