ALTER TABLE "Conversation" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Site" ADD COLUMN "ownerId" TEXT;

CREATE INDEX IF NOT EXISTS "Conversation_ownerId_idx" ON "Conversation"("ownerId");
CREATE INDEX IF NOT EXISTS "Site_ownerId_idx" ON "Site"("ownerId");
