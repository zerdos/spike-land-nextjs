-- CreateEnum
CREATE TYPE "RewriteStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'GENERAL');

-- CreateTable
CREATE TABLE "content_rewrites" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "rewrittenContent" TEXT,
    "platform" "ContentPlatform" NOT NULL DEFAULT 'GENERAL',
    "status" "RewriteStatus" NOT NULL DEFAULT 'PENDING',
    "characterLimit" INTEGER,
    "changes" JSONB,
    "toneAnalysis" JSONB,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_rewrites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_rewrites_workspaceId_idx" ON "content_rewrites"("workspaceId");

-- CreateIndex
CREATE INDEX "content_rewrites_brandProfileId_idx" ON "content_rewrites"("brandProfileId");

-- CreateIndex
CREATE INDEX "content_rewrites_createdById_idx" ON "content_rewrites"("createdById");

-- CreateIndex
CREATE INDEX "content_rewrites_status_idx" ON "content_rewrites"("status");

-- CreateIndex
CREATE INDEX "content_rewrites_createdAt_idx" ON "content_rewrites"("createdAt");

-- AddForeignKey
ALTER TABLE "content_rewrites" ADD CONSTRAINT "content_rewrites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_rewrites" ADD CONSTRAINT "content_rewrites_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_rewrites" ADD CONSTRAINT "content_rewrites_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
