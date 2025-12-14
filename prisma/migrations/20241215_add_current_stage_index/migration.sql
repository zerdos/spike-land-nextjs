-- CreateIndex: Optimize SSE stream queries filtering by status and stage
CREATE INDEX "ImageEnhancementJob_status_currentStage_idx" ON "image_enhancement_jobs"("status", "currentStage");
