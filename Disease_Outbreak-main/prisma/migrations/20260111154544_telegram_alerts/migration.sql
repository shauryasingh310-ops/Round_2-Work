-- CreateTable
CREATE TABLE "TelegramLinkCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptInAt" DATETIME,
    "telegramChatId" TEXT,
    "telegramUsername" TEXT,
    "telegramOptIn" BOOLEAN NOT NULL DEFAULT false,
    "telegramOptInAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "phoneNumber", "phoneVerified", "updatedAt", "whatsappOptIn", "whatsappOptInAt") SELECT "createdAt", "email", "emailVerified", "id", "image", "name", "passwordHash", "phoneNumber", "phoneVerified", "updatedAt", "whatsappOptIn", "whatsappOptInAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
CREATE TABLE "new_UserAlertSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "selectedState" TEXT NOT NULL,
    "browserEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "threshold" TEXT NOT NULL DEFAULT 'HIGH',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastAlertSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserAlertSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserAlertSettings" ("browserEnabled", "cooldownMinutes", "createdAt", "id", "lastAlertSentAt", "selectedState", "threshold", "updatedAt", "userId", "whatsappEnabled") SELECT "browserEnabled", "cooldownMinutes", "createdAt", "id", "lastAlertSentAt", "selectedState", "threshold", "updatedAt", "userId", "whatsappEnabled" FROM "UserAlertSettings";
DROP TABLE "UserAlertSettings";
ALTER TABLE "new_UserAlertSettings" RENAME TO "UserAlertSettings";
CREATE UNIQUE INDEX "UserAlertSettings_userId_key" ON "UserAlertSettings"("userId");
CREATE INDEX "UserAlertSettings_selectedState_idx" ON "UserAlertSettings"("selectedState");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkCode_code_key" ON "TelegramLinkCode"("code");

-- CreateIndex
CREATE INDEX "TelegramLinkCode_userId_idx" ON "TelegramLinkCode"("userId");

-- CreateIndex
CREATE INDEX "TelegramLinkCode_expiresAt_idx" ON "TelegramLinkCode"("expiresAt");
