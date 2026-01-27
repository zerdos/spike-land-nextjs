-- CreateEnum
CREATE TYPE "SandboxJobStatus" AS ENUM ('PENDING', 'SPAWNING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "sandbox_jobs" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sandboxId" TEXT,
    "requestId" TEXT,
    "status" "SandboxJobStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sandbox_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sandbox_jobs_messageId_key" ON "sandbox_jobs"("messageId");

-- CreateIndex
CREATE INDEX "sandbox_jobs_appId_startedAt_idx" ON "sandbox_jobs"("appId", "startedAt");

-- CreateIndex
CREATE INDEX "sandbox_jobs_status_idx" ON "sandbox_jobs"("status");

-- CreateIndex
CREATE INDEX "sandbox_jobs_sandboxId_idx" ON "sandbox_jobs"("sandboxId");

-- AddForeignKey
ALTER TABLE "sandbox_jobs" ADD CONSTRAINT "sandbox_jobs_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
