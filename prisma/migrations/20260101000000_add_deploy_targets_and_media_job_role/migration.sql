-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MediaJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MediaJob" ("id", "siteId", "role", "status", "input", "output", "error", "createdAt", "updatedAt")
SELECT "id", "siteId", "kind", "status", "input", "output", "error", "createdAt", "updatedAt" FROM "MediaJob";
DROP TABLE "MediaJob";
ALTER TABLE "new_MediaJob" RENAME TO "MediaJob";
PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "DeployTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokenRef" TEXT NOT NULL,
    "providerSiteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeployTarget_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeployTarget_siteId_provider_key" ON "DeployTarget"("siteId", "provider");
