/*
  Warnings:

  - You are about to drop the `NGO` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NGO";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Ngo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ngo_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ngoId" TEXT,
    "secretaryId" TEXT NOT NULL,
    "savingsAmount" REAL NOT NULL,
    "savingsFrequency" TEXT NOT NULL,
    "interestRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_ngoId_fkey" FOREIGN KEY ("ngoId") REFERENCES "Ngo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Group_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("createdAt", "id", "interestRate", "name", "ngoId", "savingsAmount", "savingsFrequency", "secretaryId", "type") SELECT "createdAt", "id", "interestRate", "name", "ngoId", "savingsAmount", "savingsFrequency", "secretaryId", "type" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
