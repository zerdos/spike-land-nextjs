-- AlterTable
ALTER TABLE "image_enhancement_jobs" ADD COLUMN "altText" TEXT,
ADD COLUMN "qualityScore" DOUBLE PRECISION,
ADD COLUMN "brandConsistencyScore" DOUBLE PRECISION;
