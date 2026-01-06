-- Rollback: Remove workspaceId from SocialAccount
-- Issue: #587 - ORB-017: Migrate existing social accounts to Orbit
-- This script reverses the workspace migration for social accounts
--
-- WARNING: This rollback should only be used if issues are detected after migration.
-- Personal workspaces created during migration will NOT be deleted to preserve data integrity.

-- ============================================================================
-- Phase 1: Drop new unique constraint
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_workspaceId_platform_accountId_key'
    ) THEN
        ALTER TABLE "social_accounts" DROP CONSTRAINT "social_accounts_workspaceId_platform_accountId_key";
        RAISE NOTICE 'Dropped unique constraint (workspaceId, platform, accountId)';
    ELSE
        RAISE NOTICE 'Unique constraint (workspaceId, platform, accountId) does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- Phase 2: Drop foreign key constraint
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_workspaceId_fkey'
    ) THEN
        ALTER TABLE "social_accounts" DROP CONSTRAINT "social_accounts_workspaceId_fkey";
        RAISE NOTICE 'Dropped foreign key constraint to workspaces';
    ELSE
        RAISE NOTICE 'Foreign key constraint does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- Phase 3: Drop workspaceId index
-- ============================================================================
DROP INDEX IF EXISTS "social_accounts_workspaceId_idx";
RAISE NOTICE 'Dropped workspaceId index (if existed)';

-- ============================================================================
-- Phase 4: Make workspaceId nullable then drop column
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'social_accounts' AND column_name = 'workspaceId'
    ) THEN
        -- First make it nullable (in case it's NOT NULL)
        ALTER TABLE "social_accounts" ALTER COLUMN "workspaceId" DROP NOT NULL;
        -- Then drop the column
        ALTER TABLE "social_accounts" DROP COLUMN "workspaceId";
        RAISE NOTICE 'Dropped workspaceId column';
    ELSE
        RAISE NOTICE 'workspaceId column does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- Phase 5: Restore original unique constraint
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_userId_platform_accountId_key'
    ) THEN
        ALTER TABLE "social_accounts"
        ADD CONSTRAINT "social_accounts_userId_platform_accountId_key"
        UNIQUE ("userId", platform, "accountId");
        RAISE NOTICE 'Restored original unique constraint (userId, platform, accountId)';
    ELSE
        RAISE NOTICE 'Original unique constraint already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Rollback Summary
-- ============================================================================
DO $$
DECLARE
    total_accounts INT;
    total_workspaces INT;
    personal_workspaces INT;
BEGIN
    SELECT COUNT(*) INTO total_accounts FROM "social_accounts";
    SELECT COUNT(*) INTO total_workspaces FROM "workspaces";
    SELECT COUNT(*) INTO personal_workspaces FROM "workspaces" WHERE "isPersonal" = true;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Rollback Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total social accounts: %', total_accounts;
    RAISE NOTICE 'Total workspaces (NOT deleted): %', total_workspaces;
    RAISE NOTICE 'Personal workspaces (NOT deleted): %', personal_workspaces;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IMPORTANT: Personal workspaces created during migration were NOT deleted.';
    RAISE NOTICE 'Review workspaces and workspace_members tables for cleanup if needed.';
    RAISE NOTICE '========================================';
END $$;
