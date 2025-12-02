-- Add stripeCustomerId to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
-- Use partial unique index to allow multiple NULL values (Postgres treats each NULL as unique by default,
-- but some versions have issues with this. Partial index explicitly excludes NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "users"("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL;

-- CreateEnum for SubscriptionStatus
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID', 'TRIALING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for AlbumPrivacy
DO $$ BEGIN
    CREATE TYPE "AlbumPrivacy" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "tokensPerMonth" INTEGER NOT NULL,
    "rolloverTokens" INTEGER NOT NULL DEFAULT 0,
    "maxRollover" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable subscription_plans
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokensPerMonth" INTEGER NOT NULL,
    "priceGBP" DECIMAL(10,2) NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "maxRollover" INTEGER NOT NULL DEFAULT 0,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "apiAccess" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable albums
CREATE TABLE IF NOT EXISTS "albums" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageId" TEXT,
    "privacy" "AlbumPrivacy" NOT NULL DEFAULT 'PRIVATE',
    "shareToken" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable album_images
CREATE TABLE IF NOT EXISTS "album_images" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "album_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes for subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndexes for subscription_plans
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_stripePriceId_key" ON "subscription_plans"("stripePriceId");
CREATE INDEX IF NOT EXISTS "subscription_plans_active_sortOrder_idx" ON "subscription_plans"("active", "sortOrder");

-- CreateIndexes for albums
CREATE UNIQUE INDEX IF NOT EXISTS "albums_shareToken_key" ON "albums"("shareToken");
CREATE INDEX IF NOT EXISTS "albums_userId_createdAt_idx" ON "albums"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "albums_privacy_idx" ON "albums"("privacy");
CREATE INDEX IF NOT EXISTS "albums_shareToken_idx" ON "albums"("shareToken");

-- CreateIndexes for album_images
CREATE UNIQUE INDEX IF NOT EXISTS "album_images_albumId_imageId_key" ON "album_images"("albumId", "imageId");
CREATE INDEX IF NOT EXISTS "album_images_albumId_sortOrder_idx" ON "album_images"("albumId", "sortOrder");
CREATE INDEX IF NOT EXISTS "album_images_imageId_idx" ON "album_images"("imageId");

-- AddForeignKey for subscriptions
DO $$ BEGIN
    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for albums
DO $$ BEGIN
    ALTER TABLE "albums" ADD CONSTRAINT "albums_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey for album_images
DO $$ BEGIN
    ALTER TABLE "album_images" ADD CONSTRAINT "album_images_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "album_images" ADD CONSTRAINT "album_images_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "enhanced_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
