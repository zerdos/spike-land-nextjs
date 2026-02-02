-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES');

-- CreateEnum
CREATE TYPE "ClientActivityType" AS ENUM ('CONTENT_SUBMITTED', 'CONTENT_APPROVED', 'CONTENT_REJECTED', 'COMMENT_ADDED', 'COMMENT_MENTION', 'STAGE_COMPLETED', 'WORKFLOW_COMPLETED', 'STATUS_CHANGED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_WORKFLOW_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_ITEM_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_DECISION';
ALTER TYPE "AuditAction" ADD VALUE 'COMMENT_CREATE';

-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'CLIENT';

-- CreateTable
CREATE TABLE "approval_workflows" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_stages" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "approvers" JSONB NOT NULL,
    "requireAllApprovers" BOOLEAN NOT NULL DEFAULT false,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_items" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "currentStage" INTEGER,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "approval_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_approvals" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_comments" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "parentId" TEXT,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "approvalItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_activities" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ClientActivityType" NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "isVisibleToClients" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_workflows_workspaceId_isActive_idx" ON "approval_workflows"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "approval_stages_workflowId_idx" ON "approval_stages"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_stages_workflowId_sequence_key" ON "approval_stages"("workflowId", "sequence");

-- CreateIndex
CREATE INDEX "approval_items_workflowId_status_idx" ON "approval_items"("workflowId", "status");

-- CreateIndex
CREATE INDEX "approval_items_contentType_contentId_idx" ON "approval_items"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "stage_approvals_itemId_idx" ON "stage_approvals"("itemId");

-- CreateIndex
CREATE INDEX "stage_approvals_stageId_idx" ON "stage_approvals"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "stage_approvals_itemId_stageId_approverId_key" ON "stage_approvals"("itemId", "stageId", "approverId");

-- CreateIndex
CREATE INDEX "content_comments_contentType_contentId_idx" ON "content_comments"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "content_comments_authorId_idx" ON "content_comments"("authorId");

-- CreateIndex
CREATE INDEX "content_comments_parentId_idx" ON "content_comments"("parentId");

-- CreateIndex
CREATE INDEX "content_comments_approvalItemId_idx" ON "content_comments"("approvalItemId");

-- CreateIndex
CREATE INDEX "client_activities_workspaceId_createdAt_idx" ON "client_activities"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "client_activities_workspaceId_isVisibleToClients_createdAt_idx" ON "client_activities"("workspaceId", "isVisibleToClients", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "client_activities_targetType_targetId_idx" ON "client_activities"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_stages" ADD CONSTRAINT "approval_stages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "approval_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "approval_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approvals" ADD CONSTRAINT "stage_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "content_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_approvalItemId_fkey" FOREIGN KEY ("approvalItemId") REFERENCES "approval_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
