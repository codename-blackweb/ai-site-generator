-- AlterTable
ALTER TABLE "Site" ADD COLUMN "designIntent" JSONB;
ALTER TABLE "Site" ADD COLUMN "designIntentLockedAt" DATETIME;
