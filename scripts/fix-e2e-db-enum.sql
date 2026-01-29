-- Fix E2E database enum migration issue
-- This script manually cleans up the old UserRole_old enum type and its dependencies

BEGIN;

-- Drop the dependent columns first
ALTER TABLE content_comments DROP COLUMN IF EXISTS "authorRole";
ALTER TABLE client_activity_feed DROP COLUMN IF EXISTS "actorRole";

-- Now we can drop the old enum type
DROP TYPE IF EXISTS "UserRole_old" CASCADE;

COMMIT;
