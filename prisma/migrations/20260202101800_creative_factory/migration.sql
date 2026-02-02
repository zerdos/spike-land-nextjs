-- CreateEnum
CREATE TYPE "CreativeSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CreativeVariantType" AS ENUM ('TEXT_ONLY', 'IMAGE_ONLY', 'COMBINED');

-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'ACTIVE', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "FatigueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "campaign_briefs" ADD COLUMN     "brandGuidelines" JSONB,
ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetCurrency" TEXT DEFAULT 'GBP',
ADD COLUMN     "callToAction" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "keyMessages" TEXT[],
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "toneOfVoice" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "brief_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workspaceId" TEXT NOT NULL,
    "fieldsSchema" JSONB NOT NULL,
    "defaultObjectives" TEXT[],
    "defaultChannels" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brief_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_channels" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "adFormats" TEXT[],
    "dimensions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "briefId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "generationPrompt" TEXT NOT NULL,
    "status" "CreativeSetStatus" NOT NULL DEFAULT 'DRAFT',
    "seedContent" TEXT,
    "variationConfig" JSONB,
    "errorMessage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "jobStatus" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_variants" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "variantType" "CreativeVariantType" NOT NULL,
    "headline" TEXT,
    "bodyText" TEXT,
    "callToAction" TEXT,
    "assetId" TEXT,
    "imageJobId" TEXT,
    "variantNumber" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VariantStatus" NOT NULL DEFAULT 'PENDING',
    "tone" TEXT,
    "length" TEXT,
    "aiPrompt" TEXT,
    "aiModel" TEXT,
    "format" TEXT,
    "placement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creative_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_performance_predictions" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "predictedCTR" DOUBLE PRECISION NOT NULL,
    "predictedER" DOUBLE PRECISION NOT NULL,
    "predictedCR" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "factorsAnalyzed" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variant_performance_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_performance" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cvr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_fatigue_alerts" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" "FatigueSeverity" NOT NULL,
    "ctrDecayPercent" DOUBLE PRECISION NOT NULL,
    "daysActive" INTEGER NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "estimatedRefreshDate" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_fatigue_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brief_templates_workspaceId_idx" ON "brief_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "creative_channels_briefId_idx" ON "creative_channels"("briefId");

-- CreateIndex
CREATE INDEX "creative_sets_briefId_idx" ON "creative_sets"("briefId");

-- CreateIndex
CREATE UNIQUE INDEX "creative_variants_imageJobId_key" ON "creative_variants"("imageJobId");

-- CreateIndex
CREATE INDEX "creative_variants_setId_idx" ON "creative_variants"("setId");

-- CreateIndex
CREATE INDEX "creative_variants_assetId_idx" ON "creative_variants"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "variant_performance_predictions_variantId_key" ON "variant_performance_predictions"("variantId");

-- CreateIndex
CREATE INDEX "creative_performance_variantId_idx" ON "creative_performance"("variantId");

-- CreateIndex
CREATE INDEX "creative_performance_date_idx" ON "creative_performance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "creative_performance_variantId_date_key" ON "creative_performance"("variantId", "date");

-- CreateIndex
CREATE INDEX "creative_fatigue_alerts_variantId_idx" ON "creative_fatigue_alerts"("variantId");

-- CreateIndex
CREATE INDEX "creative_fatigue_alerts_severity_idx" ON "creative_fatigue_alerts"("severity");

-- CreateIndex
CREATE INDEX "campaign_briefs_workspaceId_idx" ON "campaign_briefs"("workspaceId");

-- AddForeignKey
ALTER TABLE "campaign_briefs" ADD CONSTRAINT "campaign_briefs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_briefs" ADD CONSTRAINT "campaign_briefs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "brief_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_templates" ADD CONSTRAINT "brief_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brief_templates" ADD CONSTRAINT "brief_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_channels" ADD CONSTRAINT "creative_channels_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "campaign_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_sets" ADD CONSTRAINT "creative_sets_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "campaign_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_sets" ADD CONSTRAINT "creative_sets_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_variants" ADD CONSTRAINT "creative_variants_setId_fkey" FOREIGN KEY ("setId") REFERENCES "creative_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_variants" ADD CONSTRAINT "creative_variants_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_variants" ADD CONSTRAINT "creative_variants_imageJobId_fkey" FOREIGN KEY ("imageJobId") REFERENCES "mcp_generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_performance_predictions" ADD CONSTRAINT "variant_performance_predictions_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "creative_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_performance" ADD CONSTRAINT "creative_performance_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "creative_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_fatigue_alerts" ADD CONSTRAINT "creative_fatigue_alerts_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "creative_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_fatigue_alerts" ADD CONSTRAINT "creative_fatigue_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
