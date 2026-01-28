-- Add branching support to workflow_steps table
-- This migration adds support for step branching with parent-child relationships

-- Add BranchType enum
CREATE TYPE "BranchType" AS ENUM ('IF_TRUE', 'IF_FALSE', 'SWITCH_CASE', 'DEFAULT');

-- Add StepRunStatus enum for workflow run logs
CREATE TYPE "StepRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- Add branching columns to workflow_steps
ALTER TABLE "workflow_steps"
ADD COLUMN "parentStepId" TEXT,
ADD COLUMN "branchType" "BranchType",
ADD COLUMN "branchCondition" TEXT;

-- Add self-referential foreign key for parent-child relationship
ALTER TABLE "workflow_steps"
ADD CONSTRAINT "workflow_steps_parentStepId_fkey"
FOREIGN KEY ("parentStepId") REFERENCES "workflow_steps"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for parentStepId
CREATE INDEX "workflow_steps_parentStepId_idx" ON "workflow_steps"("parentStepId");

-- Add stepStatus column to workflow_run_logs
ALTER TABLE "workflow_run_logs"
ADD COLUMN "stepStatus" "StepRunStatus";

-- Add index for stepId in workflow_run_logs
CREATE INDEX "workflow_run_logs_stepId_idx" ON "workflow_run_logs"("stepId");
