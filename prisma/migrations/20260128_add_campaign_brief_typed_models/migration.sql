-- Phase 4: Campaign Brief JSON Extraction
-- Adds typed models for CampaignBrief.targetAudience and CampaignBrief.campaignObjectives

-- CreateEnum
CREATE TYPE "ObjectiveType" AS ENUM ('AWARENESS', 'ENGAGEMENT', 'CONVERSION', 'RETENTION', 'ADVOCACY');

-- CreateTable
CREATE TABLE "campaign_target_audiences" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "genders" TEXT[],
    "locations" TEXT[],
    "interests" TEXT[],
    "behaviors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_target_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_objectives" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "type" "ObjectiveType" NOT NULL,
    "metric" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_target_audiences_briefId_key" ON "campaign_target_audiences"("briefId");

-- CreateIndex
CREATE INDEX "campaign_objectives_briefId_idx" ON "campaign_objectives"("briefId");

-- AddForeignKey
ALTER TABLE "campaign_target_audiences" ADD CONSTRAINT "campaign_target_audiences_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "campaign_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_objectives" ADD CONSTRAINT "campaign_objectives_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "campaign_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
