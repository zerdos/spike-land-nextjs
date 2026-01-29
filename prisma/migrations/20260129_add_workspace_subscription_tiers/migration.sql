-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WorkspaceSubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "subscriptionTier" "WorkspaceSubscriptionTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "maxSocialAccounts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "maxScheduledPosts" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "maxAbTests" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "monthlyAiCredits" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "usedAiCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "maxTeamMembers" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "billingCycleStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_stripeSubscriptionId_key"
  ON "workspaces"("stripeSubscriptionId");
