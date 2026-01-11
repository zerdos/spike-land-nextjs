-- Create new tables first
CREATE TABLE "allocator_autopilot_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "AutopilotMode" NOT NULL DEFAULT 'CONSERVATIVE',
    "maxDailyBudgetChange" DECIMAL(10,2) NOT NULL DEFAULT 10.0,
    "maxSingleChange" DECIMAL(10,2) NOT NULL DEFAULT 5.0,
    "minRoasThreshold" DECIMAL(10,2),
    "maxCpaThreshold" DECIMAL(10,2),
    "pauseOnAnomaly" BOOLEAN NOT NULL DEFAULT true,
    "requireApprovalAbove" DECIMAL(10,2),
    "encryptedSettings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allocator_autopilot_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "allocator_autopilot_executions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "recommendationType" TEXT NOT NULL,
    "status" "AutopilotExecutionStatus" NOT NULL,
    "previousBudget" DECIMAL(10,2) NOT NULL,
    "newBudget" DECIMAL(10,2) NOT NULL,
    "budgetChange" DECIMAL(10,2) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "rollbackOfId" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackReason" TEXT,
    "rolledBackByUserId" TEXT,

    CONSTRAINT "allocator_autopilot_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "allocator_daily_budget_moves" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalMoved" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netChange" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allocator_daily_budget_moves_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "enabledFor" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- Create Enums
CREATE TYPE "AutopilotMode" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');
CREATE TYPE "AutopilotExecutionStatus" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'SKIPPED', 'ROLLED_BACK', 'PAUSED');

-- Create Indexes for new tables
CREATE UNIQUE INDEX "allocator_autopilot_configs_workspaceId_campaignId_key" ON "allocator_autopilot_configs"("workspaceId", "campaignId");
CREATE INDEX "allocator_autopilot_configs_workspaceId_idx" ON "allocator_autopilot_configs"("workspaceId");
CREATE INDEX "allocator_autopilot_configs_campaignId_idx" ON "allocator_autopilot_configs"("campaignId");

CREATE UNIQUE INDEX "allocator_autopilot_executions_rollbackOfId_key" ON "allocator_autopilot_executions"("rollbackOfId");
CREATE INDEX "allocator_autopilot_executions_workspaceId_idx" ON "allocator_autopilot_executions"("workspaceId");
CREATE INDEX "allocator_autopilot_executions_campaignId_idx" ON "allocator_autopilot_executions"("campaignId");
CREATE INDEX "allocator_autopilot_executions_executedAt_idx" ON "allocator_autopilot_executions"("executedAt");

CREATE UNIQUE INDEX "allocator_daily_budget_moves_campaignId_date_key" ON "allocator_daily_budget_moves"("campaignId", "date");
CREATE INDEX "allocator_daily_budget_moves_campaignId_idx" ON "allocator_daily_budget_moves"("campaignId");

CREATE UNIQUE INDEX "feature_flags_name_key" ON "feature_flags"("name");

-- Add Foreign Keys
ALTER TABLE "allocator_autopilot_configs" ADD CONSTRAINT "allocator_autopilot_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocator_autopilot_configs" ADD CONSTRAINT "allocator_autopilot_configs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "allocator_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "allocator_autopilot_executions" ADD CONSTRAINT "allocator_autopilot_executions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocator_autopilot_executions" ADD CONSTRAINT "allocator_autopilot_executions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "allocator_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocator_autopilot_executions" ADD CONSTRAINT "allocator_autopilot_executions_rollbackOfId_fkey" FOREIGN KEY ("rollbackOfId") REFERENCES "allocator_autopilot_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "allocator_daily_budget_moves" ADD CONSTRAINT "allocator_daily_budget_moves_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "allocator_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Other constraints from original diff (excluding ones that might already exist if re-run)
-- This file is intended to be a clean 'up' migration for the new feature.
