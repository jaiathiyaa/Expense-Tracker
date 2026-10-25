-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "clientTxId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_userId_clientTxId_key" ON "Transaction"("userId", "clientTxId");
