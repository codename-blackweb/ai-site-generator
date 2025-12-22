-- AlterTable
ALTER TABLE "Section" ADD COLUMN "content" JSONB;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN "voiceContract" JSONB;

-- CreateTable
CREATE TABLE "SectionContentHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "instruction" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT,
    CONSTRAINT "SectionContentHistory_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SectionContentHistory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
