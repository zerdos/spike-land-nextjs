-- CreateEnum
CREATE TYPE "GuardrailType" AS ENUM ('PROHIBITED_TOPIC', 'REQUIRED_DISCLOSURE', 'CONTENT_WARNING');

-- CreateEnum
CREATE TYPE "GuardrailSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "VocabularyType" AS ENUM ('PREFERRED', 'BANNED', 'REPLACEMENT');

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mission" TEXT,
    "values" JSONB,
    "toneDescriptors" JSONB,
    "logoUrl" TEXT,
    "logoR2Key" TEXT,
    "colorPalette" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_guardrails" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "type" "GuardrailType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severity" "GuardrailSeverity" NOT NULL DEFAULT 'MEDIUM',
    "ruleConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_guardrails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_vocabulary" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "type" "VocabularyType" NOT NULL,
    "term" TEXT NOT NULL,
    "replacement" TEXT,
    "context" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: brand_profiles
CREATE UNIQUE INDEX "brand_profiles_workspaceId_key" ON "brand_profiles"("workspaceId");

-- CreateIndex
CREATE INDEX "brand_profiles_workspaceId_idx" ON "brand_profiles"("workspaceId");

-- CreateIndex
CREATE INDEX "brand_profiles_isActive_idx" ON "brand_profiles"("isActive");

-- CreateIndex
CREATE INDEX "brand_profiles_createdById_idx" ON "brand_profiles"("createdById");

-- CreateIndex: brand_guardrails
CREATE INDEX "brand_guardrails_brandProfileId_idx" ON "brand_guardrails"("brandProfileId");

-- CreateIndex
CREATE INDEX "brand_guardrails_brandProfileId_type_idx" ON "brand_guardrails"("brandProfileId", "type");

-- CreateIndex
CREATE INDEX "brand_guardrails_brandProfileId_isActive_idx" ON "brand_guardrails"("brandProfileId", "isActive");

-- CreateIndex
CREATE INDEX "brand_guardrails_type_severity_idx" ON "brand_guardrails"("type", "severity");

-- CreateIndex: brand_vocabulary
CREATE INDEX "brand_vocabulary_brandProfileId_idx" ON "brand_vocabulary"("brandProfileId");

-- CreateIndex
CREATE INDEX "brand_vocabulary_brandProfileId_type_idx" ON "brand_vocabulary"("brandProfileId", "type");

-- CreateIndex
CREATE INDEX "brand_vocabulary_brandProfileId_isActive_idx" ON "brand_vocabulary"("brandProfileId", "isActive");

-- CreateIndex
CREATE INDEX "brand_vocabulary_term_idx" ON "brand_vocabulary"("term");

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex: GIN index for full-text search on vocabulary terms
CREATE INDEX "brand_vocabulary_term_gin_idx" ON "brand_vocabulary" USING gin (term gin_trgm_ops);

-- AddForeignKey: brand_profiles -> workspaces
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: brand_profiles -> users (createdBy)
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: brand_profiles -> users (updatedBy)
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: brand_guardrails -> brand_profiles
ALTER TABLE "brand_guardrails" ADD CONSTRAINT "brand_guardrails_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: brand_vocabulary -> brand_profiles
ALTER TABLE "brand_vocabulary" ADD CONSTRAINT "brand_vocabulary_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "brand_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
