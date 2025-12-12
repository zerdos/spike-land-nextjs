-- AlterTable
ALTER TABLE "tracked_urls" ADD COLUMN "isBuiltIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tracked_urls_isBuiltIn_idx" ON "tracked_urls"("isBuiltIn");
