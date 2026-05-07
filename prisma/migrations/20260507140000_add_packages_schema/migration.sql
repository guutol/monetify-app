-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('GENERATION', 'PACKAGE');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASED', 'CONSUMED');

-- AlterTable Order: adicionar tipo e planId (todos os pedidos existentes ficam como GENERATION)
ALTER TABLE "Order" ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'GENERATION';
ALTER TABLE "Order" ADD COLUMN "planId" TEXT;

-- CreateTable CreditTransaction
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable User: mudar default de credits de 3 para 0 (usuários existentes mantêm seus valores atuais)
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0;
