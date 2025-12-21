-- Add tier column to user_token_balances table if it doesn't exist
-- This column tracks the user's subscription tier for token capacity calculations

DO $$
BEGIN
    -- Add tier column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_token_balances' AND column_name = 'tier'
    ) THEN
        ALTER TABLE "user_token_balances" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
    END IF;

    -- Create index on tier column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_token_balances' AND indexname = 'user_token_balances_tier_idx'
    ) THEN
        CREATE INDEX "user_token_balances_tier_idx" ON "user_token_balances"("tier");
    END IF;
END $$;
