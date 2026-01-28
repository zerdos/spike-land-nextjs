-- Add workflow trigger support
-- This migration adds schedule, webhook, and event-based triggers for workflows

-- Add WorkflowEventType enum
CREATE TYPE "WorkflowEventType" AS ENUM (
  'MENTION_RECEIVED',
  'ENGAGEMENT_THRESHOLD',
  'FOLLOWER_MILESTONE',
  'CRISIS_DETECTED',
  'POST_PUBLISHED',
  'INBOX_ITEM_RECEIVED'
);

-- Create workflow_schedules table for cron-based triggers
CREATE TABLE "workflow_schedules" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "cronExpression" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_schedules_pkey" PRIMARY KEY ("id")
);

-- Create workflow_webhooks table for webhook-based triggers
CREATE TABLE "workflow_webhooks" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "webhookToken" TEXT NOT NULL,
  "secretHash" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastTriggeredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_webhooks_pkey" PRIMARY KEY ("id")
);

-- Create workflow_event_subscriptions table for event-based triggers
CREATE TABLE "workflow_event_subscriptions" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "eventType" "WorkflowEventType" NOT NULL,
  "filterConfig" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "workflow_event_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for webhook token
ALTER TABLE "workflow_webhooks" ADD CONSTRAINT "workflow_webhooks_webhookToken_key" UNIQUE ("webhookToken");

-- Add unique constraint for workflow + event type combination
ALTER TABLE "workflow_event_subscriptions" ADD CONSTRAINT "workflow_event_subscriptions_workflowId_eventType_key" UNIQUE ("workflowId", "eventType");

-- Add foreign key constraints
ALTER TABLE "workflow_schedules" ADD CONSTRAINT "workflow_schedules_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_webhooks" ADD CONSTRAINT "workflow_webhooks_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_event_subscriptions" ADD CONSTRAINT "workflow_event_subscriptions_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for efficient querying
CREATE INDEX "workflow_schedules_workflowId_idx" ON "workflow_schedules"("workflowId");
CREATE INDEX "workflow_schedules_nextRunAt_isActive_idx" ON "workflow_schedules"("nextRunAt", "isActive");

CREATE INDEX "workflow_webhooks_workflowId_idx" ON "workflow_webhooks"("workflowId");
CREATE INDEX "workflow_webhooks_webhookToken_idx" ON "workflow_webhooks"("webhookToken");

CREATE INDEX "workflow_event_subscriptions_eventType_isActive_idx" ON "workflow_event_subscriptions"("eventType", "isActive");
