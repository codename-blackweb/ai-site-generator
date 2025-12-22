-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "audience" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "primaryConversion" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "sitePurpose" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "toneAxis" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "wantsBlog" BOOLEAN;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "mode" TEXT;
