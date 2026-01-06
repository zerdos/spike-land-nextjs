-- Migration: Add workspaceId to SocialAccount
-- Issue: #587 - ORB-017: Migrate existing social accounts to Orbit
-- This migration associates social accounts with workspaces in the Orbit system

-- ============================================================================
-- Phase 1: Add nullable workspaceId column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'social_accounts' AND column_name = 'workspaceId'
    ) THEN
        ALTER TABLE "social_accounts" ADD COLUMN "workspaceId" TEXT;
        RAISE NOTICE 'Phase 1: Added nullable workspaceId column to social_accounts';
    ELSE
        RAISE NOTICE 'Phase 1: workspaceId column already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- Phase 2: Create personal workspaces for users who have social accounts but no workspace
-- ============================================================================
DO $$
DECLARE
    user_record RECORD;
    new_workspace_id TEXT;
    workspace_slug TEXT;
    slug_suffix INT;
    workspaces_created INT := 0;
BEGIN
    RAISE NOTICE 'Phase 2: Creating personal workspaces for users with social accounts...';

    -- Find users with social accounts but no personal workspace
    FOR user_record IN
        SELECT DISTINCT sa."userId", u.name, u.email
        FROM "social_accounts" sa
        JOIN "users" u ON u.id = sa."userId"
        WHERE NOT EXISTS (
            SELECT 1 FROM "workspace_members" wm
            JOIN "workspaces" w ON w.id = wm."workspaceId"
            WHERE wm."userId" = sa."userId" AND w."isPersonal" = true
        )
    LOOP
        -- Generate workspace ID using gen_random_uuid
        new_workspace_id := 'ws_' || replace(gen_random_uuid()::text, '-', '');

        -- Generate unique slug from user name or email
        workspace_slug := lower(regexp_replace(
            COALESCE(user_record.name, split_part(user_record.email, '@', 1)),
            '[^a-z0-9]', '-', 'g'
        ));
        workspace_slug := regexp_replace(workspace_slug, '-+', '-', 'g');
        workspace_slug := trim(both '-' from workspace_slug);

        -- Ensure slug is not empty
        IF workspace_slug = '' OR workspace_slug IS NULL THEN
            workspace_slug := 'workspace';
        END IF;

        -- Handle duplicate slugs by appending suffix
        slug_suffix := 0;
        WHILE EXISTS (
            SELECT 1 FROM "workspaces"
            WHERE slug = workspace_slug || CASE WHEN slug_suffix > 0 THEN '-' || slug_suffix::text ELSE '' END
        ) LOOP
            slug_suffix := slug_suffix + 1;
        END LOOP;

        IF slug_suffix > 0 THEN
            workspace_slug := workspace_slug || '-' || slug_suffix::text;
        END IF;

        -- Create personal workspace
        INSERT INTO "workspaces" (id, name, slug, "isPersonal", "createdAt", "updatedAt")
        VALUES (
            new_workspace_id,
            COALESCE(user_record.name, 'Personal') || '''s Workspace',
            workspace_slug,
            true,
            NOW(),
            NOW()
        );

        -- Add user as workspace owner
        INSERT INTO "workspace_members" (id, "workspaceId", "userId", role, "invitedAt", "joinedAt", "createdAt", "updatedAt")
        VALUES (
            'wm_' || replace(gen_random_uuid()::text, '-', ''),
            new_workspace_id,
            user_record."userId",
            'OWNER',
            NOW(),
            NOW(),
            NOW(),
            NOW()
        );

        workspaces_created := workspaces_created + 1;
        RAISE NOTICE 'Created personal workspace % (slug: %) for user %', new_workspace_id, workspace_slug, user_record."userId";
    END LOOP;

    RAISE NOTICE 'Phase 2 complete: Created % personal workspaces', workspaces_created;
END $$;

-- ============================================================================
-- Phase 3: Backfill workspaceId for all social accounts
-- ============================================================================
DO $$
DECLARE
    account_record RECORD;
    personal_workspace_id TEXT;
    accounts_updated INT := 0;
    accounts_orphaned INT := 0;
BEGIN
    RAISE NOTICE 'Phase 3: Backfilling workspaceId for social accounts...';

    FOR account_record IN
        SELECT sa.id, sa."userId"
        FROM "social_accounts" sa
        WHERE sa."workspaceId" IS NULL
    LOOP
        -- Find user's personal workspace first
        SELECT w.id INTO personal_workspace_id
        FROM "workspaces" w
        JOIN "workspace_members" wm ON wm."workspaceId" = w.id
        WHERE wm."userId" = account_record."userId"
          AND w."isPersonal" = true
          AND wm."joinedAt" IS NOT NULL
        LIMIT 1;

        -- If no personal workspace, use first workspace where user is OWNER or ADMIN
        IF personal_workspace_id IS NULL THEN
            SELECT w.id INTO personal_workspace_id
            FROM "workspaces" w
            JOIN "workspace_members" wm ON wm."workspaceId" = w.id
            WHERE wm."userId" = account_record."userId"
              AND wm.role IN ('OWNER', 'ADMIN')
              AND wm."joinedAt" IS NOT NULL
            ORDER BY w."createdAt" ASC
            LIMIT 1;
        END IF;

        IF personal_workspace_id IS NOT NULL THEN
            UPDATE "social_accounts"
            SET "workspaceId" = personal_workspace_id, "updatedAt" = NOW()
            WHERE id = account_record.id;
            accounts_updated := accounts_updated + 1;
        ELSE
            accounts_orphaned := accounts_orphaned + 1;
            RAISE WARNING 'Orphaned social account: id=%, userId=% (no workspace found)', account_record.id, account_record."userId";
        END IF;
    END LOOP;

    RAISE NOTICE 'Phase 3 complete: Updated % accounts, % orphaned', accounts_updated, accounts_orphaned;
END $$;

-- ============================================================================
-- Phase 4: Log migration summary
-- ============================================================================
DO $$
DECLARE
    total_accounts INT;
    migrated_accounts INT;
    orphaned_accounts INT;
    total_workspaces INT;
    personal_workspaces INT;
BEGIN
    SELECT COUNT(*) INTO total_accounts FROM "social_accounts";
    SELECT COUNT(*) INTO migrated_accounts FROM "social_accounts" WHERE "workspaceId" IS NOT NULL;
    SELECT COUNT(*) INTO orphaned_accounts FROM "social_accounts" WHERE "workspaceId" IS NULL;
    SELECT COUNT(*) INTO total_workspaces FROM "workspaces";
    SELECT COUNT(*) INTO personal_workspaces FROM "workspaces" WHERE "isPersonal" = true;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary (Phase 4)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total social accounts: %', total_accounts;
    RAISE NOTICE 'Migrated accounts: %', migrated_accounts;
    RAISE NOTICE 'Orphaned accounts: %', orphaned_accounts;
    RAISE NOTICE 'Total workspaces: %', total_workspaces;
    RAISE NOTICE 'Personal workspaces: %', personal_workspaces;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Phase 5: Finalize schema changes (only if no orphaned accounts)
-- ============================================================================
DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count FROM "social_accounts" WHERE "workspaceId" IS NULL;

    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Cannot finalize migration: % orphaned accounts exist. Manual intervention required.', orphaned_count;
    END IF;

    RAISE NOTICE 'Phase 5: Finalizing schema changes...';

    -- Step 5.1: Drop old unique constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_userId_platform_accountId_key'
    ) THEN
        ALTER TABLE "social_accounts" DROP CONSTRAINT "social_accounts_userId_platform_accountId_key";
        RAISE NOTICE 'Dropped old unique constraint (userId, platform, accountId)';
    END IF;

    -- Step 5.2: Make workspaceId NOT NULL
    ALTER TABLE "social_accounts" ALTER COLUMN "workspaceId" SET NOT NULL;
    RAISE NOTICE 'Made workspaceId NOT NULL';

    -- Step 5.3: Add foreign key constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_workspaceId_fkey'
    ) THEN
        ALTER TABLE "social_accounts"
        ADD CONSTRAINT "social_accounts_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"(id) ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to workspaces';
    END IF;

    -- Step 5.4: Add new unique constraint (workspace + platform + accountId)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'social_accounts_workspaceId_platform_accountId_key'
    ) THEN
        ALTER TABLE "social_accounts"
        ADD CONSTRAINT "social_accounts_workspaceId_platform_accountId_key"
        UNIQUE ("workspaceId", platform, "accountId");
        RAISE NOTICE 'Added new unique constraint (workspaceId, platform, accountId)';
    END IF;

    -- Step 5.5: Add index on workspaceId
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'social_accounts' AND indexname = 'social_accounts_workspaceId_idx'
    ) THEN
        CREATE INDEX "social_accounts_workspaceId_idx" ON "social_accounts"("workspaceId");
        RAISE NOTICE 'Added index on workspaceId';
    END IF;

    RAISE NOTICE 'Phase 5 complete: Schema changes finalized';
END $$;
