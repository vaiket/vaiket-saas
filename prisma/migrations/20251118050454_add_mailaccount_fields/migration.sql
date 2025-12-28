/*
  Warnings:

  - You are about to drop the column `oauthExpiresAt` on the `MailAccount` table. All the data in the column will be lost.
  - You are about to drop the column `oauthProvider` on the `MailAccount` table. All the data in the column will be lost.
  - Made the column `mailAccountId` on table `IncomingEmail` required. This step will fail if there are existing NULL values in that column.
  - Made the column `smtpHost` on table `MailAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `smtpPort` on table `MailAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `smtpUser` on table `MailAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `smtpPass` on table `MailAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `MailAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mailAccountId` on table `MailLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `TenantSettings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "IncomingEmail" DROP CONSTRAINT "IncomingEmail_mailAccountId_fkey";

-- DropForeignKey
ALTER TABLE "MailAccount" DROP CONSTRAINT "MailAccount_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MailLog" DROP CONSTRAINT "MailLog_mailAccountId_fkey";

-- AlterTable
ALTER TABLE "IncomingEmail" ADD COLUMN     "html" TEXT,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'pending',
ALTER COLUMN "mailAccountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MailAccount" DROP COLUMN "oauthExpiresAt",
DROP COLUMN "oauthProvider",
ADD COLUMN     "authType" TEXT NOT NULL DEFAULT 'password',
ADD COLUMN     "oauthExpiry" TIMESTAMP(3),
ALTER COLUMN "smtpHost" SET NOT NULL,
ALTER COLUMN "smtpPort" SET NOT NULL,
ALTER COLUMN "smtpUser" SET NOT NULL,
ALTER COLUMN "smtpPass" SET NOT NULL,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "MailLog" ALTER COLUMN "mailAccountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TenantSettings" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "TenantApiKey" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailLog" ADD CONSTRAINT "MailLog_mailAccountId_fkey" FOREIGN KEY ("mailAccountId") REFERENCES "MailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingEmail" ADD CONSTRAINT "IncomingEmail_mailAccountId_fkey" FOREIGN KEY ("mailAccountId") REFERENCES "MailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
