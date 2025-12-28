/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Onboarding` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Onboarding_tenantId_key";

-- AlterTable
ALTER TABLE "Onboarding" DROP COLUMN "createdAt",
ADD COLUMN     "businessName" TEXT;
