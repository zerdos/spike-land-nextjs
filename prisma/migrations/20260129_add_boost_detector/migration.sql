-- CreateEnum for PostType
CREATE TYPE "PostType" AS ENUM ('SOCIAL_POST', 'SCHEDULED_POST');

-- CreateEnum for BoostRecommendationStatus
CREATE TYPE "BoostRecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'APPLIED', 'EXPIRED');

-- CreateEnum for AppliedBoostStatus
CREATE TYPE "AppliedBoostStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED');

-- CreateTable PostPerformance
CREATE TABLE "post_performance" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "postType" "PostType" NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagementCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressionVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "boostScore" DOUBLE PRECISION,
    "boostTrigger" TEXT,
    "estimatedROI" DOUBLE PRECISION,
    "metricPeriod" TIMESTAMP(3) NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable PostBoostRecommendation
CREATE TABLE "post_boost_recommendations" (
    "id" TEXT NOT NULL,
    "postPerformanceId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "postType" "PostType" NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BoostRecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "reasoning" TEXT NOT NULL,
    "suggestedBudget" DOUBLE PRECISION NOT NULL,
    "estimatedImpressions" INTEGER NOT NULL,
    "estimatedClicks" INTEGER NOT NULL,
    "estimatedConversions" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "recommendedPlatforms" TEXT[],
    "targetAudience" JSONB,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "actualSpend" DOUBLE PRECISION,
    "actualROI" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_boost_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable AppliedBoost
CREATE TABLE "applied_boosts" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "postType" "PostType" NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" "MarketingPlatform" NOT NULL,
    "externalCampaignId" TEXT,
    "budget" DOUBLE PRECISION NOT NULL,
    "actualImpressions" INTEGER NOT NULL DEFAULT 0,
    "actualClicks" INTEGER NOT NULL DEFAULT 0,
    "actualConversions" INTEGER NOT NULL DEFAULT 0,
    "actualSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualROI" DOUBLE PRECISION,
    "status" "AppliedBoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "applied_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_performance_workspaceId_boostScore_idx" ON "post_performance"("workspaceId", "boostScore");

-- CreateIndex
CREATE INDEX "post_performance_workspaceId_metricPeriod_idx" ON "post_performance"("workspaceId", "metricPeriod");

-- CreateIndex
CREATE INDEX "post_performance_postId_postType_idx" ON "post_performance"("postId", "postType");

-- CreateIndex
CREATE INDEX "post_boost_recommendations_workspaceId_status_idx" ON "post_boost_recommendations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "post_boost_recommendations_userId_status_idx" ON "post_boost_recommendations"("userId", "status");

-- CreateIndex
CREATE INDEX "post_boost_recommendations_expiresAt_idx" ON "post_boost_recommendations"("expiresAt");

-- CreateIndex
CREATE INDEX "post_boost_recommendations_postId_postType_idx" ON "post_boost_recommendations"("postId", "postType");

-- CreateIndex
CREATE INDEX "applied_boosts_workspaceId_idx" ON "applied_boosts"("workspaceId");

-- CreateIndex
CREATE INDEX "applied_boosts_status_idx" ON "applied_boosts"("status");

-- CreateIndex
CREATE INDEX "applied_boosts_externalCampaignId_idx" ON "applied_boosts"("externalCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "applied_boosts_recommendationId_key" ON "applied_boosts"("recommendationId");

-- AddForeignKey
ALTER TABLE "post_performance" ADD CONSTRAINT "post_performance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_boost_recommendations" ADD CONSTRAINT "post_boost_recommendations_postPerformanceId_fkey" FOREIGN KEY ("postPerformanceId") REFERENCES "post_performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_boost_recommendations" ADD CONSTRAINT "post_boost_recommendations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_boost_recommendations" ADD CONSTRAINT "post_boost_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_boosts" ADD CONSTRAINT "applied_boosts_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "post_boost_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applied_boosts" ADD CONSTRAINT "applied_boosts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
