-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MonetizationType" AS ENUM ('FREE', 'ONE_TIME', 'SUBSCRIPTION', 'FREEMIUM', 'USAGE_BASED');

-- CreateEnum
CREATE TYPE "SubscriptionInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TokenTransactionType" AS ENUM ('EARN_REGENERATION', 'EARN_PURCHASE', 'EARN_BONUS', 'SPEND_ENHANCEMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "StripePaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EnhancementTier" AS ENUM ('TIER_1K', 'TIER_2K', 'TIER_4K');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "forkedFrom" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequirementStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monetization_models" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "type" "MonetizationType" NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2),
    "subscriptionInterval" "SubscriptionInterval",
    "features" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monetization_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastRegeneration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TokenTransactionType" NOT NULL,
    "source" TEXT,
    "sourceId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "priceUSD" DECIMAL(10,2) NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "tokensGranted" INTEGER NOT NULL,
    "amountUSD" DECIMAL(10,2) NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" "StripePaymentStatus" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enhanced_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "originalUrl" TEXT NOT NULL,
    "originalR2Key" TEXT NOT NULL,
    "originalWidth" INTEGER NOT NULL,
    "originalHeight" INTEGER NOT NULL,
    "originalSizeBytes" INTEGER NOT NULL,
    "originalFormat" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enhanced_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_enhancement_jobs" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "EnhancementTier" NOT NULL,
    "tokensCost" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL,
    "enhancedUrl" TEXT,
    "enhancedR2Key" TEXT,
    "enhancedWidth" INTEGER,
    "enhancedHeight" INTEGER,
    "enhancedSizeBytes" INTEGER,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "geminiPrompt" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_enhancement_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "apps_domain_key" ON "apps"("domain");

-- CreateIndex
CREATE INDEX "apps_userId_idx" ON "apps"("userId");

-- CreateIndex
CREATE INDEX "apps_forkedFrom_idx" ON "apps"("forkedFrom");

-- CreateIndex
CREATE INDEX "apps_status_idx" ON "apps"("status");

-- CreateIndex
CREATE INDEX "requirements_appId_idx" ON "requirements"("appId");

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "requirements"("status");

-- CreateIndex
CREATE INDEX "requirements_priority_idx" ON "requirements"("priority");

-- CreateIndex
CREATE INDEX "monetization_models_appId_idx" ON "monetization_models"("appId");

-- CreateIndex
CREATE INDEX "monetization_models_type_idx" ON "monetization_models"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_token_balances_userId_key" ON "user_token_balances"("userId");

-- CreateIndex
CREATE INDEX "user_token_balances_userId_idx" ON "user_token_balances"("userId");

-- CreateIndex
CREATE INDEX "token_transactions_userId_createdAt_idx" ON "token_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "token_transactions_sourceId_idx" ON "token_transactions"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_packages_stripePriceId_key" ON "tokens_packages"("stripePriceId");

-- CreateIndex
CREATE INDEX "tokens_packages_active_sortOrder_idx" ON "tokens_packages"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_payments_stripePaymentIntentId_key" ON "stripe_payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "stripe_payments_userId_createdAt_idx" ON "stripe_payments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "stripe_payments_stripePaymentIntentId_idx" ON "stripe_payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "enhanced_images_userId_createdAt_idx" ON "enhanced_images"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "enhanced_images_isPublic_createdAt_idx" ON "enhanced_images"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "image_enhancement_jobs_userId_status_createdAt_idx" ON "image_enhancement_jobs"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "image_enhancement_jobs_imageId_idx" ON "image_enhancement_jobs"("imageId");

-- CreateIndex
CREATE INDEX "image_enhancement_jobs_status_updatedAt_idx" ON "image_enhancement_jobs"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_forkedFrom_fkey" FOREIGN KEY ("forkedFrom") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monetization_models" ADD CONSTRAINT "monetization_models_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_token_balances" ADD CONSTRAINT "user_token_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "tokens_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enhanced_images" ADD CONSTRAINT "enhanced_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_enhancement_jobs" ADD CONSTRAINT "image_enhancement_jobs_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "enhanced_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_enhancement_jobs" ADD CONSTRAINT "image_enhancement_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

