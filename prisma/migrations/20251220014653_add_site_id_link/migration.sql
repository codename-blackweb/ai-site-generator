-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sitePurpose" TEXT,
    "audience" TEXT,
    "primaryConversion" TEXT,
    "toneAxis" TEXT,
    "wantsBlog" BOOLEAN,
    "siteId" TEXT,
    CONSTRAINT "Conversation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("audience", "createdAt", "id", "primaryConversion", "sitePurpose", "toneAxis", "updatedAt", "wantsBlog") SELECT "audience", "createdAt", "id", "primaryConversion", "sitePurpose", "toneAxis", "updatedAt", "wantsBlog" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE UNIQUE INDEX "Conversation_siteId_key" ON "Conversation"("siteId");
CREATE TABLE "new_Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT,
    "purpose" TEXT,
    "audience" TEXT,
    "primaryConversion" TEXT,
    "toneAxis" TEXT,
    "blogEnabled" BOOLEAN,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "voiceContract" JSONB,
    "themeId" TEXT,
    "releaseState" TEXT NOT NULL DEFAULT 'draft',
    "publishedSnapshotId" TEXT,
    "advisoryMode" TEXT NOT NULL DEFAULT 'assistive',
    "hasReceivedPrescriptiveMoment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("advisoryMode", "conversationId", "createdAt", "hasReceivedPrescriptiveMoment", "id", "publishedSnapshotId", "releaseState", "themeId", "updatedAt", "voiceContract") SELECT "advisoryMode", "conversationId", "createdAt", "hasReceivedPrescriptiveMoment", "id", "publishedSnapshotId", "releaseState", "themeId", "updatedAt", "voiceContract" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
