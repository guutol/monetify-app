-- AlterTable: add original product image reference to Order
ALTER TABLE "Order" ADD COLUMN "originalImageKey" TEXT;
