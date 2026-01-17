-- Add soft-delete fields for bin/trash functionality

-- Add deletedAt to apps table for app-level soft delete
ALTER TABLE "apps" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Create index on deletedAt for efficient bin queries and cleanup jobs
CREATE INDEX IF NOT EXISTS "apps_deletedAt_idx" ON "apps"("deletedAt");

-- Add deletedAt to app_messages table for cascade soft delete on edit
ALTER TABLE "app_messages" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Create composite index on appId and deletedAt for message queries
CREATE INDEX IF NOT EXISTS "app_messages_appId_deletedAt_idx" ON "app_messages"("appId", "deletedAt");
