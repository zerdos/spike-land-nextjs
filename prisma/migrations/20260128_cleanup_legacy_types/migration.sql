-- Drop orphaned tables that reference UserRole_old enum
-- These tables were removed from the Prisma schema but still exist in the database
DROP TABLE IF EXISTS content_comments CASCADE;
DROP TABLE IF EXISTS client_activity_feed CASCADE;

-- Now we can safely drop the old enum type
DROP TYPE IF EXISTS "UserRole_old" CASCADE;
