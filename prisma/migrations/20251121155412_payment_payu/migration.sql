-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "txnid" TEXT NOT NULL,
    "tenantId" INTEGER,
    "userId" INTEGER,
    "amount" INTEGER NOT NULL,
    "product" TEXT,
    "status" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_txnid_key" ON "Payment"("txnid");
