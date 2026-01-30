-- CreateTable
CREATE TABLE "claude_code_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "projectPath" TEXT,
    "workingDirectory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalTasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalSessionTime" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "claude_code_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claude_code_agents_userId_lastSeenAt_idx" ON "claude_code_agents"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "claude_code_agents_machineId_idx" ON "claude_code_agents"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "claude_code_agents_userId_machineId_sessionId_key" ON "claude_code_agents"("userId", "machineId", "sessionId");

-- AddForeignKey
ALTER TABLE "claude_code_agents" ADD CONSTRAINT "claude_code_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
