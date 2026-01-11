-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'DISCORD');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ERROR', 'RATE_LIMITED', 'RESTRICTED');

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_workspaceId_platform_accountId_key" ON "social_accounts"("workspaceId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "social_accounts_userId_idx" ON "social_accounts"("userId");

-- CreateIndex
CREATE INDEX "social_accounts_workspaceId_idx" ON "social_accounts"("workspaceId");

-- CreateIndex
CREATE INDEX "social_accounts_status_idx" ON "social_accounts"("status");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InboxItemType" AS ENUM ('MENTION', 'COMMENT', 'DIRECT_MESSAGE', 'REPLY', 'REVIEW');

-- CreateEnum
CREATE TYPE "InboxItemStatus" AS ENUM ('UNREAD', 'READ', 'PENDING_REPLY', 'REPLIED', 'ARCHIVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RelayDraftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DraftEditType" AS ENUM ('MINOR_TWEAK', 'TONE_ADJUSTMENT', 'CONTENT_REVISION', 'COMPLETE_REWRITE', 'PLATFORM_FORMATTING');

-- CreateEnum
CREATE TYPE "DraftAuditAction" AS ENUM ('CREATED', 'VIEWED', 'EDITED', 'APPROVED', 'REJECTED', 'SENT', 'SEND_FAILED', 'REGENERATED');

-- CreateTable
CREATE TABLE "inbox_items" (
    "id" TEXT NOT NULL,
    "type" "InboxItemType" NOT NULL,
    "status" "InboxItemStatus" NOT NULL DEFAULT 'UNREAD',
    "platform" "SocialPlatform" NOT NULL,
    "platformItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderHandle" TEXT,
    "senderAvatarUrl" TEXT,
    "originalPostId" TEXT,
    "originalPostContent" TEXT,
    "metadata" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbox_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relay_drafts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "status" "RelayDraftStatus" NOT NULL DEFAULT 'PENDING',
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "inboxItemId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relay_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_edit_history" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "editedContent" TEXT NOT NULL,
    "editType" "DraftEditType" NOT NULL,
    "changesSummary" TEXT,
    "editDistance" INTEGER,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_audit_logs" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "action" "DraftAuditAction" NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbox_items_workspaceId_platform_platformItemId_key" ON "inbox_items"("workspaceId", "platform", "platformItemId");

-- CreateIndex
CREATE INDEX "inbox_items_workspaceId_idx" ON "inbox_items"("workspaceId");

-- CreateIndex
CREATE INDEX "inbox_items_workspaceId_status_idx" ON "inbox_items"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "inbox_items_workspaceId_platform_idx" ON "inbox_items"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "inbox_items_accountId_idx" ON "inbox_items"("accountId");

-- CreateIndex
CREATE INDEX "inbox_items_assignedToId_idx" ON "inbox_items"("assignedToId");

-- CreateIndex
CREATE INDEX "inbox_items_receivedAt_idx" ON "inbox_items"("receivedAt");

-- CreateIndex
CREATE INDEX "relay_drafts_inboxItemId_idx" ON "relay_drafts"("inboxItemId");

-- CreateIndex
CREATE INDEX "relay_drafts_inboxItemId_status_idx" ON "relay_drafts"("inboxItemId", "status");

-- CreateIndex
CREATE INDEX "relay_drafts_status_idx" ON "relay_drafts"("status");

-- CreateIndex
CREATE INDEX "draft_edit_history_draftId_idx" ON "draft_edit_history"("draftId");

-- CreateIndex
CREATE INDEX "draft_edit_history_editedById_idx" ON "draft_edit_history"("editedById");

-- CreateIndex
CREATE INDEX "draft_edit_history_editType_idx" ON "draft_edit_history"("editType");

-- CreateIndex
CREATE INDEX "draft_audit_logs_draftId_idx" ON "draft_audit_logs"("draftId");

-- CreateIndex
CREATE INDEX "draft_audit_logs_performedById_idx" ON "draft_audit_logs"("performedById");

-- CreateIndex
CREATE INDEX "draft_audit_logs_action_idx" ON "draft_audit_logs"("action");

-- CreateIndex
CREATE INDEX "draft_audit_logs_createdAt_idx" ON "draft_audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_drafts" ADD CONSTRAINT "relay_drafts_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "inbox_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relay_drafts" ADD CONSTRAINT "relay_drafts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_edit_history" ADD CONSTRAINT "draft_edit_history_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_edit_history" ADD CONSTRAINT "draft_edit_history_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "relay_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_audit_logs" ADD CONSTRAINT "draft_audit_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_audit_logs" ADD CONSTRAINT "draft_audit_logs_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "relay_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- NOTE:
-- The following operations were removed from this migration because they
-- duplicate definitions handled in other migrations / the schema:
--   - CREATE TYPE "SocialPlatform" (already exists in schema.prisma at line 1936)
--   - CREATE TYPE "SubscriptionTier" (already exists in schema.prisma at line 889)
--   - CREATE TABLE "social_accounts" (already exists as SocialAccount model at line 1781)
--   - ALTER TABLE "user_token_balances" ADD COLUMN "tier" (already exists)
--   - CREATE INDEX "user_token_balances_tier_idx" (already exists)
--
-- This migration file has been adjusted to avoid conflicts with existing schema definitions.
-- If you need to add inbox-related models, please review the schema.prisma file and create
-- a new migration with only the missing definitions.
--
-- SECURITY NOTE:
-- The social_accounts table stores OAuth credentials (accessToken, accessTokenSecret, refreshToken)
-- as plain TEXT fields. Consider encrypting these token fields at rest using an application-level
-- encryption key or a dedicated secrets service. Strictly limit access to them in both schema design
-- and application logic to prevent unauthorized access in case of database compromise.

