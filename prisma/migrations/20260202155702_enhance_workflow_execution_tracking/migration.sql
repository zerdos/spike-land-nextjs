-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN     "stepExecutions" JSONB,
ADD COLUMN     "triggerData" JSONB,
ADD COLUMN     "triggerType" TEXT;
