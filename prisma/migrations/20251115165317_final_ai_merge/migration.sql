/*
  Warnings:

  - You are about to drop the column `mode` on the `TenantSettings` table. All the data in the column will be lost.
  - Made the column `aiFallback` on table `TenantSettings` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TenantSettings" DROP COLUMN "mode",
ADD COLUMN     "aiMode" TEXT NOT NULL DEFAULT 'balanced',
ADD COLUMN     "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN     "autoReply" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tone" TEXT NOT NULL DEFAULT 'professional',
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "aiPrimary" SET DEFAULT 'openai',
ALTER COLUMN "aiFallback" SET NOT NULL,
ALTER COLUMN "aiFallback" SET DEFAULT 'deepseek,gemini';

-- AddForeignKey
ALTER TABLE "MailAccount" ADD CONSTRAINT "MailAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
