-- CreateEnum
CREATE TYPE "AttributionType" AS ENUM ('FIRST_TOUCH', 'LAST_TOUCH');

-- CreateEnum
CREATE TYPE "ConversionType" AS ENUM ('SIGNUP', 'ENHANCEMENT', 'PURCHASE');

-- CreateTable
CREATE TABLE "visitor_sessions" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionEnd" TIMESTAMP(3),
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ipCountry" TEXT,
    "ipCity" TEXT,
    "referrer" TEXT,
    "landingPage" TEXT NOT NULL,
    "exitPage" TEXT,
    "pageViewCount" INTEGER NOT NULL DEFAULT 0,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeOnPage" INTEGER,
    "scrollDepth" INTEGER,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_attributions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attributionType" "AttributionType" NOT NULL,
    "platform" TEXT,
    "externalCampaignId" TEXT,
    "utmCampaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "conversionType" "ConversionType" NOT NULL,
    "conversionValue" DOUBLE PRECISION,
    "convertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_metrics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_sessions_visitorId_idx" ON "visitor_sessions"("visitorId");

-- CreateIndex
CREATE INDEX "visitor_sessions_userId_idx" ON "visitor_sessions"("userId");

-- CreateIndex
CREATE INDEX "visitor_sessions_utmCampaign_idx" ON "visitor_sessions"("utmCampaign");

-- CreateIndex
CREATE INDEX "visitor_sessions_utmSource_idx" ON "visitor_sessions"("utmSource");

-- CreateIndex
CREATE INDEX "visitor_sessions_sessionStart_idx" ON "visitor_sessions"("sessionStart");

-- CreateIndex
CREATE INDEX "visitor_sessions_gclid_idx" ON "visitor_sessions"("gclid");

-- CreateIndex
CREATE INDEX "visitor_sessions_fbclid_idx" ON "visitor_sessions"("fbclid");

-- CreateIndex
CREATE INDEX "page_views_sessionId_timestamp_idx" ON "page_views"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "page_views_path_idx" ON "page_views"("path");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_timestamp_idx" ON "analytics_events"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "analytics_events_name_idx" ON "analytics_events"("name");

-- CreateIndex
CREATE INDEX "analytics_events_category_idx" ON "analytics_events"("category");

-- CreateIndex
CREATE INDEX "campaign_attributions_userId_idx" ON "campaign_attributions"("userId");

-- CreateIndex
CREATE INDEX "campaign_attributions_utmCampaign_idx" ON "campaign_attributions"("utmCampaign");

-- CreateIndex
CREATE INDEX "campaign_attributions_externalCampaignId_idx" ON "campaign_attributions"("externalCampaignId");

-- CreateIndex
CREATE INDEX "campaign_attributions_convertedAt_idx" ON "campaign_attributions"("convertedAt");

-- CreateIndex
CREATE INDEX "campaign_attributions_conversionType_idx" ON "campaign_attributions"("conversionType");

-- CreateIndex
CREATE INDEX "campaign_attributions_attributionType_idx" ON "campaign_attributions"("attributionType");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_cache_cacheKey_key" ON "campaign_metrics_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "campaign_metrics_cache_cacheKey_idx" ON "campaign_metrics_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "campaign_metrics_cache_expiresAt_idx" ON "campaign_metrics_cache"("expiresAt");

-- AddForeignKey
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "visitor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "visitor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_attributions" ADD CONSTRAINT "campaign_attributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
