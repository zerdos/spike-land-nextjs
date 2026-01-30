-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "agent_connection_requests" (
    "id" TEXT NOT NULL,
    "connectId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "displayName" TEXT,
    "projectPath" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "agentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "agent_connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_connection_requests_connectId_key" ON "agent_connection_requests"("connectId");

-- CreateIndex
CREATE INDEX "agent_connection_requests_connectId_status_idx" ON "agent_connection_requests"("connectId", "status");

-- CreateIndex
CREATE INDEX "agent_connection_requests_expiresAt_idx" ON "agent_connection_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "agent_messages_agentId_createdAt_idx" ON "agent_messages"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_messages_agentId_isRead_idx" ON "agent_messages"("agentId", "isRead");

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "claude_code_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
