-- AddPasswordHashToUsers
-- Add passwordHash field for email/password authentication (primarily for testing)

ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
