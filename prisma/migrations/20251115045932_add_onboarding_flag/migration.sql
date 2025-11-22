/*
  Warnings:

  - You are about to drop the column `onboardingCompleted` on the `SmtpCredentials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SmtpCredentials" DROP COLUMN "onboardingCompleted";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
