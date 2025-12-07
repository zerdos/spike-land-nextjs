-- Add workflowRunId column for Vercel Workflow cancellation support
ALTER TABLE "image_enhancement_jobs" ADD COLUMN "workflowRunId" TEXT;

-- Create index for faster lookups by workflowRunId
CREATE INDEX "image_enhancement_jobs_workflowRunId_idx" ON "image_enhancement_jobs"("workflowRunId");
