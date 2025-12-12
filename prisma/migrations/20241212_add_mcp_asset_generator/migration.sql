-- CreateEnum
CREATE TYPE "McpJobType" AS ENUM ('GENERATE', 'MODIFY');

-- AlterEnum
ALTER TYPE "TokenTransactionType" ADD VALUE 'SPEND_MCP_GENERATION';

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_generation_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "type" "McpJobType" NOT NULL,
    "tier" "EnhancementTier" NOT NULL,
    "tokensCost" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL,
    "prompt" TEXT NOT NULL,
    "inputImageUrl" TEXT,
    "inputImageR2Key" TEXT,
    "outputImageUrl" TEXT,
    "outputImageR2Key" TEXT,
    "outputWidth" INTEGER,
    "outputHeight" INTEGER,
    "outputSizeBytes" INTEGER,
    "errorMessage" TEXT,
    "geminiModel" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_isActive_idx" ON "api_keys"("userId", "isActive");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "mcp_generation_jobs_userId_status_createdAt_idx" ON "mcp_generation_jobs"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "mcp_generation_jobs_apiKeyId_idx" ON "mcp_generation_jobs"("apiKeyId");

-- CreateIndex
CREATE INDEX "mcp_generation_jobs_status_updatedAt_idx" ON "mcp_generation_jobs"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_generation_jobs" ADD CONSTRAINT "mcp_generation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_generation_jobs" ADD CONSTRAINT "mcp_generation_jobs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
