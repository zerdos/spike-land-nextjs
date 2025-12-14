-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('ANALYZING', 'CROPPING', 'PROMPTING', 'GENERATING');

-- AlterTable: Add currentStage to image_enhancement_jobs for progress tracking
ALTER TABLE "image_enhancement_jobs" ADD COLUMN "currentStage" "PipelineStage";
