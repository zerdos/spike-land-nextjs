-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('BRIDGEMIND', 'GITHUB');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'SYNCING', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncEventType" AS ENUM ('ITEM_CREATED', 'ITEM_UPDATED', 'ITEM_DELETED', 'SYNC_COMPLETED', 'SYNC_FAILED');

-- DropIndex
DROP INDEX "error_logs_environment_idx";

-- DropIndex
DROP INDEX "error_logs_errorType_idx";

-- DropIndex
DROP INDEX "error_logs_sourceFile_idx";

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "source" "SyncSource" NOT NULL DEFAULT 'BRIDGEMIND',
    "status" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastSuccessfulSync" TIMESTAMP(3),
    "lastAttemptedSync" TIMESTAMP(3),
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "syncCursor" TEXT,
    "itemsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncItemMapping" (
    "id" TEXT NOT NULL,
    "bridgemindId" TEXT NOT NULL,
    "githubIssueNumber" INTEGER NOT NULL,
    "githubIssueId" TEXT,
    "githubProjectItemId" TEXT,
    "bridgemindVersion" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "eventType" "SyncEventType" NOT NULL,
    "source" "SyncSource" NOT NULL DEFAULT 'BRIDGEMIND',
    "itemId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncItemMapping_bridgemindId_key" ON "SyncItemMapping"("bridgemindId");

-- CreateIndex
CREATE INDEX "SyncItemMapping_bridgemindId_idx" ON "SyncItemMapping"("bridgemindId");

-- CreateIndex
CREATE INDEX "SyncItemMapping_githubIssueNumber_idx" ON "SyncItemMapping"("githubIssueNumber");

-- CreateIndex
CREATE INDEX "SyncEvent_eventType_idx" ON "SyncEvent"("eventType");

-- CreateIndex
CREATE INDEX "SyncEvent_createdAt_idx" ON "SyncEvent"("createdAt");

-- CreateIndex
CREATE INDEX "error_logs_environment_timestamp_idx" ON "error_logs"("environment", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_errorType_timestamp_idx" ON "error_logs"("errorType", "timestamp");

-- CreateIndex
CREATE INDEX "error_logs_sourceFile_timestamp_idx" ON "error_logs"("sourceFile", "timestamp");
