-- CreateTable
CREATE TABLE "youtube_video_analytics" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "platformPostId" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "averageViewDuration" INTEGER,
    "averageViewPercentage" DOUBLE PRECISION,
    "subscribersGained" INTEGER NOT NULL DEFAULT 0,
    "subscribersLost" INTEGER NOT NULL DEFAULT 0,
    "trafficSourcesData" JSONB,
    "viewerDemographics" JSONB,
    "topGeographies" JSONB,
    "retentionData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoPublishedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "youtube_video_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_comments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorChannelId" TEXT NOT NULL,
    "authorProfileImage" TEXT,
    "textDisplay" TEXT NOT NULL,
    "textOriginal" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" TEXT NOT NULL DEFAULT 'published',
    "canReply" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "youtube_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "youtube_video_analytics_videoId_idx" ON "youtube_video_analytics"("videoId");

-- CreateIndex
CREATE INDEX "youtube_video_analytics_accountId_idx" ON "youtube_video_analytics"("accountId");

-- CreateIndex
CREATE INDEX "youtube_video_analytics_workspaceId_idx" ON "youtube_video_analytics"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_comments_commentId_key" ON "youtube_comments"("commentId");

-- CreateIndex
CREATE INDEX "youtube_comments_videoId_idx" ON "youtube_comments"("videoId");

-- CreateIndex
CREATE INDEX "youtube_comments_accountId_idx" ON "youtube_comments"("accountId");

-- CreateIndex
CREATE INDEX "youtube_comments_moderationStatus_idx" ON "youtube_comments"("moderationStatus");

-- AddForeignKey
ALTER TABLE "youtube_video_analytics" ADD CONSTRAINT "youtube_video_analytics_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_video_analytics" ADD CONSTRAINT "youtube_video_analytics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_comments" ADD CONSTRAINT "youtube_comments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
