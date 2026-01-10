-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'DISCORD');

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "accountId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "followers" INTEGER,
    "following" INTEGER,
    "posts" INTEGER,
    "url" TEXT,
    "externalId" TEXT,
    "accessToken" TEXT,
    "accessTokenSecret" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- Add tier column to user_token_balances table
ALTER TABLE "user_token_balances" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
CREATE INDEX "user_token_balances_tier_idx" ON "user_token_balances"("tier");
