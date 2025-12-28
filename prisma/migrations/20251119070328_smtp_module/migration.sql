-- DropForeignKey
ALTER TABLE "IncomingEmail" DROP CONSTRAINT "IncomingEmail_tenantId_fkey";

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "customerType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmtpAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- AddForeignKey
ALTER TABLE "IncomingEmail" ADD CONSTRAINT "IncomingEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
