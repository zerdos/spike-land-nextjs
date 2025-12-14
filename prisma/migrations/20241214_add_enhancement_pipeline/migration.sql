-- CreateEnum
CREATE TYPE "PipelineVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'LINK');

-- CreateTable
CREATE TABLE "enhancement_pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "visibility" "PipelineVisibility" NOT NULL DEFAULT 'PRIVATE',
    "shareToken" TEXT,
    "tier" "EnhancementTier" NOT NULL DEFAULT 'TIER_1K',
    "analysisConfig" JSONB,
    "autoCropConfig" JSONB,
    "promptConfig" JSONB,
    "generationConfig" JSONB,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enhancement_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enhancement_pipelines_shareToken_key" ON "enhancement_pipelines"("shareToken");

-- CreateIndex
CREATE INDEX "enhancement_pipelines_userId_idx" ON "enhancement_pipelines"("userId");

-- CreateIndex
CREATE INDEX "enhancement_pipelines_visibility_idx" ON "enhancement_pipelines"("visibility");

-- AlterTable: Add pipelineId to albums
ALTER TABLE "albums" ADD COLUMN "pipelineId" TEXT;

-- CreateIndex
CREATE INDEX "albums_pipelineId_idx" ON "albums"("pipelineId");

-- AlterTable: Add pipelineId to image_enhancement_jobs
ALTER TABLE "image_enhancement_jobs" ADD COLUMN "pipelineId" TEXT;

-- CreateIndex
CREATE INDEX "image_enhancement_jobs_pipelineId_idx" ON "image_enhancement_jobs"("pipelineId");

-- AddForeignKey
ALTER TABLE "enhancement_pipelines" ADD CONSTRAINT "enhancement_pipelines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "enhancement_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_enhancement_jobs" ADD CONSTRAINT "image_enhancement_jobs_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "enhancement_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
