/*
  Warnings:

  - You are about to drop the column `changeType` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Recommendation` table. All the data in the column will be lost.
  - Added the required column `context` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `criteria` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `criteriaText` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `impactSummary` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phase` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rationale` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recommendationId` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `score` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tradeoffs` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whyNotAlternatives` to the `Recommendation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "auditRunId" TEXT,
    "recommendationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "impactSummary" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "criteriaText" JSONB NOT NULL,
    "phase" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "criteria" JSONB NOT NULL,
    "tool" TEXT,
    "args" JSONB NOT NULL,
    "tradeoffs" JSONB NOT NULL,
    "whyNotAlternatives" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT,
    CONSTRAINT "Recommendation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Recommendation" ("args", "auditRunId", "conversationId", "createdAt", "id", "key", "siteId", "status", "tool") SELECT "args", "auditRunId", "conversationId", "createdAt", "id", "key", "siteId", "status", "tool" FROM "Recommendation";
DROP TABLE "Recommendation";
ALTER TABLE "new_Recommendation" RENAME TO "Recommendation";
CREATE TABLE "new_Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT,
    "voiceContract" JSONB,
    "themeId" TEXT,
    "releaseState" TEXT NOT NULL DEFAULT 'draft',
    "publishedSnapshotId" TEXT,
    "advisoryMode" TEXT NOT NULL DEFAULT 'assistive',
    "hasReceivedPrescriptiveMoment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Site_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Site" ("advisoryMode", "conversationId", "createdAt", "id", "publishedSnapshotId", "releaseState", "themeId", "updatedAt", "voiceContract") SELECT "advisoryMode", "conversationId", "createdAt", "id", "publishedSnapshotId", "releaseState", "themeId", "updatedAt", "voiceContract" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
