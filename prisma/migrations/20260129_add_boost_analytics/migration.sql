-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttributionEventType" AS ENUM ('VIEW', 'CLICK', 'ENGAGEMENT', 'CONVERSION', 'SHARE');

-- CreateEnum
CREATE TYPE "TouchpointType" AS ENUM ('ORGANIC', 'PAID', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('BOOST_HIGH_PERFORMER', 'BOOST_TRENDING', 'OPTIMIZE_TARGETING', 'INCREASE_BUDGET', 'ADJUST_TIMING', 'REPLICATE_SUCCESS');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('PATTERN', 'ANOMALY', 'BEST_PRACTICE', 'WARNING', 'OPPORTUNITY');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('TIMING', 'TARGETING', 'BUDGET', 'CONTENT_TYPE', 'PLATFORM', 'AUDIENCE');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "boost_campaigns" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "originalPostId" TEXT,
    "campaignId" TEXT NOT NULL,
    "boostedAt" TIMESTAMP(3) NOT NULL,
    "boostedBy" TEXT NOT NULL,
    "boostReason" TEXT NOT NULL,
    "boostStrategy" TEXT NOT NULL,
    "organicMetrics" JSONB NOT NULL,
    "targetingCriteria" JSONB,
    "initialBudget" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_performance_snapshots" (
    "id" TEXT NOT NULL,
    "boostCampaignId" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "daysSinceBoosted" INTEGER NOT NULL,
    "organicImpressions" INTEGER NOT NULL,
    "organicEngagements" INTEGER NOT NULL,
    "organicReach" INTEGER NOT NULL,
    "paidImpressions" INTEGER NOT NULL,
    "paidClicks" INTEGER NOT NULL,
    "paidConversions" INTEGER NOT NULL,
    "paidSpend" INTEGER NOT NULL,
    "paidCtr" DOUBLE PRECISION NOT NULL,
    "paidCpa" DOUBLE PRECISION NOT NULL,
    "paidRoas" DOUBLE PRECISION NOT NULL,
    "attributedOrganic" INTEGER NOT NULL,
    "attributedPaid" INTEGER NOT NULL,
    "attributedOverlap" INTEGER NOT NULL,
    "incrementalReach" INTEGER NOT NULL,
    "costPerResult" DOUBLE PRECISION NOT NULL,
    "totalRoi" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boost_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_attribution_events" (
    "id" TEXT NOT NULL,
    "boostCampaignId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "eventType" "AttributionEventType" NOT NULL,
    "touchpointType" "TouchpointType" NOT NULL,
    "platform" TEXT NOT NULL,
    "eventValue" INTEGER,
    "eventMetadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boost_attribution_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_ml_training_data" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "boostCampaignId" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "labels" JSONB NOT NULL,
    "dataQualityScore" DOUBLE PRECISION NOT NULL,
    "isTrainingReady" BOOLEAN NOT NULL DEFAULT false,
    "aggregatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_ml_training_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_recommendations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "suggestedPostId" TEXT,
    "recommendationType" "RecommendationType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL,
    "suggestedBudget" INTEGER NOT NULL,
    "suggestedDuration" INTEGER NOT NULL,
    "suggestedTiming" TIMESTAMP(3) NOT NULL,
    "suggestedTargeting" JSONB NOT NULL,
    "projectedReach" INTEGER NOT NULL,
    "projectedConversions" INTEGER NOT NULL,
    "projectedRoi" DOUBLE PRECISION NOT NULL,
    "confidenceInterval" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "supportingData" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3),
    "resultingBoostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_insights" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "visualization" JSONB,
    "dataPoints" JSONB NOT NULL,
    "comparisonMetrics" JSONB,
    "actionable" BOOLEAN NOT NULL DEFAULT true,
    "suggestedActions" JSONB,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boost_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boost_campaigns_campaignId_key" ON "boost_campaigns"("campaignId");

-- CreateIndex
CREATE INDEX "boost_campaigns_workspaceId_idx" ON "boost_campaigns"("workspaceId");

-- CreateIndex
CREATE INDEX "boost_campaigns_originalPostId_idx" ON "boost_campaigns"("originalPostId");

-- CreateIndex
CREATE INDEX "boost_campaigns_campaignId_idx" ON "boost_campaigns"("campaignId");

-- CreateIndex
CREATE INDEX "boost_campaigns_boostedAt_idx" ON "boost_campaigns"("boostedAt");

-- CreateIndex
CREATE INDEX "boost_campaigns_status_idx" ON "boost_campaigns"("status");

-- CreateIndex
CREATE INDEX "boost_performance_snapshots_boostCampaignId_snapshotAt_idx" ON "boost_performance_snapshots"("boostCampaignId", "snapshotAt");

-- CreateIndex
CREATE INDEX "boost_performance_snapshots_snapshotAt_idx" ON "boost_performance_snapshots"("snapshotAt");

-- CreateIndex
CREATE INDEX "boost_attribution_events_boostCampaignId_occurredAt_idx" ON "boost_attribution_events"("boostCampaignId", "occurredAt");

-- CreateIndex
CREATE INDEX "boost_attribution_events_sessionId_idx" ON "boost_attribution_events"("sessionId");

-- CreateIndex
CREATE INDEX "boost_attribution_events_userId_idx" ON "boost_attribution_events"("userId");

-- CreateIndex
CREATE INDEX "boost_attribution_events_occurredAt_idx" ON "boost_attribution_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "boost_ml_training_data_boostCampaignId_key" ON "boost_ml_training_data"("boostCampaignId");

-- CreateIndex
CREATE INDEX "boost_ml_training_data_workspaceId_isTrainingReady_idx" ON "boost_ml_training_data"("workspaceId", "isTrainingReady");

-- CreateIndex
CREATE INDEX "boost_ml_training_data_aggregatedAt_idx" ON "boost_ml_training_data"("aggregatedAt");

-- CreateIndex
CREATE INDEX "boost_recommendations_workspaceId_status_idx" ON "boost_recommendations"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "boost_recommendations_confidence_idx" ON "boost_recommendations"("confidence");

-- CreateIndex
CREATE INDEX "boost_recommendations_createdAt_idx" ON "boost_recommendations"("createdAt");

-- CreateIndex
CREATE INDEX "boost_recommendations_expiresAt_idx" ON "boost_recommendations"("expiresAt");

-- CreateIndex
CREATE INDEX "boost_insights_workspaceId_acknowledged_idx" ON "boost_insights"("workspaceId", "acknowledged");

-- CreateIndex
CREATE INDEX "boost_insights_severity_acknowledged_idx" ON "boost_insights"("severity", "acknowledged");

-- CreateIndex
CREATE INDEX "boost_insights_createdAt_idx" ON "boost_insights"("createdAt");

-- AddForeignKey
ALTER TABLE "boost_campaigns" ADD CONSTRAINT "boost_campaigns_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_campaigns" ADD CONSTRAINT "boost_campaigns_originalPostId_fkey" FOREIGN KEY ("originalPostId") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_campaigns" ADD CONSTRAINT "boost_campaigns_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "allocator_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_performance_snapshots" ADD CONSTRAINT "boost_performance_snapshots_boostCampaignId_fkey" FOREIGN KEY ("boostCampaignId") REFERENCES "boost_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_attribution_events" ADD CONSTRAINT "boost_attribution_events_boostCampaignId_fkey" FOREIGN KEY ("boostCampaignId") REFERENCES "boost_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_ml_training_data" ADD CONSTRAINT "boost_ml_training_data_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_ml_training_data" ADD CONSTRAINT "boost_ml_training_data_boostCampaignId_fkey" FOREIGN KEY ("boostCampaignId") REFERENCES "boost_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_recommendations" ADD CONSTRAINT "boost_recommendations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_recommendations" ADD CONSTRAINT "boost_recommendations_suggestedPostId_fkey" FOREIGN KEY ("suggestedPostId") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_insights" ADD CONSTRAINT "boost_insights_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
