-- Add CANCELLED to JobStatus enum
-- This fixes the bug where cancelling a job throws: invalid input value for enum "JobStatus": "CANCELLED"

-- Add CANCELLED value to the JobStatus enum
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
