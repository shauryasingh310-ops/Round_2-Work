-- Add once-a-day digest settings
ALTER TABLE "UserAlertSettings" ADD COLUMN "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "UserAlertSettings" ADD COLUMN "lastDailyDigestSentAt" DATETIME;
