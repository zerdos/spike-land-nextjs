import { PrismaPg } from "@prisma/adapter-pg";
import { EnhancementTier, JobStatus, PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { getE2EDatabaseUrl } from "./lib/db-protection";

// Load environment variables
config({ path: ".env.local", quiet: true });

/**
 * Seed script for testing image enhancement UI
 *
 * Usage:
 *   npm run prisma:seed -- seed-enhanced.ts
 *
 * Creates mock data for testing the enhancement comparison slider
 * with a test image from /public/test-image.png
 *
 * SAFETY: This script has production database protection.
 * It will refuse to run against production databases.
 * See prisma/lib/db-protection.ts for details.
 */

// Get connection string with production protection
const connectionString = getE2EDatabaseUrl();
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = "e2e-test-user";
  const imageId = "mock-enhanced-image-id";
  const jobId = "mock-job-id";

  // Ensure user exists
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "E2E Test User",
      email: "test@example.com",
      image: "https://github.com/shadcn.png",
    },
  });

  // Create EnhancedImage
  const enhancedImage = await prisma.enhancedImage.upsert({
    where: { id: imageId },
    update: {},
    create: {
      id: imageId,
      userId: userId,
      name: "test-image.png",
      originalUrl: "/test-image.png", // Local public URL
      originalR2Key: "mock-original-key",
      originalWidth: 1024,
      originalHeight: 768,
      originalSizeBytes: 1024 * 1024,
      originalFormat: "png",
      isPublic: true,
    },
  });

  // Create ImageEnhancementJob
  await prisma.imageEnhancementJob.upsert({
    where: { id: jobId },
    update: {},
    create: {
      id: jobId,
      imageId: imageId,
      userId: userId,
      tier: EnhancementTier.TIER_4K,
      tokensCost: 10,
      status: JobStatus.COMPLETED,
      enhancedUrl: "/test-image.png", // Using same image for test
      enhancedR2Key: "mock-enhanced-key",
      enhancedWidth: 4096,
      enhancedHeight: 3072,
      enhancedSizeBytes: 4 * 1024 * 1024,
      geminiPrompt: "Mock enhancement prompt",
      processingStartedAt: new Date(),
      processingCompletedAt: new Date(),
    },
  });

  console.log({ enhancedImage });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
