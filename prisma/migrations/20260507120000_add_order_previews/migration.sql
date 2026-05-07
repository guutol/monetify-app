-- AlterTable: add preview columns to GeneratedImage
ALTER TABLE "GeneratedImage" ADD COLUMN "isChosen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GeneratedImage" ADD COLUMN "orderId" TEXT;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
