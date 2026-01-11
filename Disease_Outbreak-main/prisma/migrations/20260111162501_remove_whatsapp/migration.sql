/*
  Warnings:

  - You are about to drop the `PhoneVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `phoneNumber` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappOptIn` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappOptInAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappEnabled` on the `UserAlertSettings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "PhoneVerification_expiresAt_idx";

-- DropIndex
DROP INDEX "PhoneVerification_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PhoneVerification";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" DATETIME,
    "passwordHash" TEXT,
    "telegramChatId" TEXT,
    "telegramUsername" TEXT,
    "telegramOptIn" BOOLEAN NOT NULL DEFAULT false,
    "telegramOptInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "telegramChatId", "telegramOptIn", "telegramOptInAt", "telegramUsername", "updatedAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "telegramChatId", "telegramOptIn", "telegramOptInAt", "telegramUsername", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_UserAlertSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "selectedState" TEXT NOT NULL,
    "browserEnabled" BOOLEAN NOT NULL DEFAULT true,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "threshold" TEXT NOT NULL DEFAULT 'HIGH',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastAlertSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserAlertSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserAlertSettings" ("browserEnabled", "cooldownMinutes", "createdAt", "id", "lastAlertSentAt", "selectedState", "telegramEnabled", "threshold", "updatedAt", "userId") SELECT "browserEnabled", "cooldownMinutes", "createdAt", "id", "lastAlertSentAt", "selectedState", "telegramEnabled", "threshold", "updatedAt", "userId" FROM "UserAlertSettings";
DROP TABLE "UserAlertSettings";
ALTER TABLE "new_UserAlertSettings" RENAME TO "UserAlertSettings";
CREATE UNIQUE INDEX "UserAlertSettings_userId_key" ON "UserAlertSettings"("userId");
CREATE INDEX "UserAlertSettings_selectedState_idx" ON "UserAlertSettings"("selectedState");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
