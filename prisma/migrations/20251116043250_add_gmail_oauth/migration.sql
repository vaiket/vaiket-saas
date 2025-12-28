-- AlterTable
ALTER TABLE "MailAccount" ADD COLUMN     "oauthAccessToken" TEXT,
ADD COLUMN     "oauthExpiresAt" TIMESTAMP(3),
ADD COLUMN     "oauthProvider" TEXT,
ADD COLUMN     "oauthRefreshToken" TEXT,
ALTER COLUMN "smtpHost" DROP NOT NULL,
ALTER COLUMN "smtpPort" DROP NOT NULL,
ALTER COLUMN "smtpUser" DROP NOT NULL,
ALTER COLUMN "smtpPass" DROP NOT NULL;
