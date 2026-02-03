-- CreateTable
CREATE TABLE IF NOT EXISTS "learnit_content" (
    "id" TEXT NOT NULL,
    "path" TEXT[],
    "slug" TEXT NOT NULL,
    "parentSlug" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wikiLinks" TEXT[],
    "status" "LearnItStatus" NOT NULL DEFAULT 'PUBLISHED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-3-flash-preview',
    "generatedById" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "learnit_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "learnit_content_slug_key" ON "learnit_content"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learnit_content_slug_idx" ON "learnit_content"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learnit_content_path_idx" ON "learnit_content"("path");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learnit_content_viewCount_idx" ON "learnit_content"("viewCount");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "learnit_content_status_idx" ON "learnit_content"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learnit_content_generatedById_fkey') THEN
        ALTER TABLE "learnit_content" ADD CONSTRAINT "learnit_content_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
