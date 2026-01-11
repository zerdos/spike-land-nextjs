import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { getE2EDatabaseUrl } from "./lib/db-protection";

// Load environment variables from .env.local
// Use quiet: true to suppress verbose logging
config({ path: ".env.local", quiet: true });

/**
 * E2E Test Data Cleanup Script
 *
 * Resets test data to a clean state after E2E tests.
 * Preserves test users for auth but removes:
 * - Test orders, order items, shipments
 * - Test albums and album images
 * - Test images
 * - Test enhancement jobs
 * - Test API keys
 * - Test vouchers and redemptions
 * - Test featured gallery items
 * - Test MCP generation jobs
 *
 * Usage:
 *   npx tsx prisma/cleanup-e2e.ts
 *   DATABASE_URL_E2E=<url> npx tsx prisma/cleanup-e2e.ts
 *
 * All E2E test data is identified by "e2e-" prefix in IDs.
 *
 * SAFETY: This script has production database protection.
 * It will refuse to run against production databases.
 * See prisma/lib/db-protection.ts for details.
 */

// Get connection string with production protection
const connectionString = getE2EDatabaseUrl();

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Test user IDs to preserve
const TEST_USER_ID = "test-user-id";
const ADMIN_USER_ID = "admin-user-id";
const SECOND_USER_ID = "e2e-second-user-id";

async function cleanup() {
  console.log("Starting E2E cleanup...\n");

  // 1. Delete test shipments
  const deletedShipments = await prisma.merchShipment.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedShipments.count} test shipments`);

  // 2. Delete test order items
  const deletedOrderItems = await prisma.merchOrderItem.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedOrderItems.count} test order items`);

  // 3. Delete test orders
  const deletedOrders = await prisma.merchOrder.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedOrders.count} test orders`);

  // 4. Delete album-image links for test albums
  const deletedAlbumImages = await prisma.albumImage.deleteMany({
    where: {
      albumId: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedAlbumImages.count} test album-image links`);

  // 5. Delete test albums
  const deletedAlbums = await prisma.album.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedAlbums.count} test albums`);

  // 6. Delete test enhancement jobs
  const deletedJobs = await prisma.imageEnhancementJob.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "e2e-" } },
        { userId: TEST_USER_ID },
      ],
    },
  });
  console.log(`Deleted ${deletedJobs.count} test enhancement jobs`);

  // 7. Delete test images
  const deletedImages = await prisma.enhancedImage.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedImages.count} test images`);

  // 8. Delete test API keys
  const deletedApiKeys = await prisma.apiKey.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedApiKeys.count} test API keys`);

  // 9. Delete test voucher redemptions
  const deletedRedemptions = await prisma.voucherRedemption.deleteMany({
    where: {
      voucherId: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedRedemptions.count} test voucher redemptions`);

  // 10. Delete test vouchers
  const deletedVouchers = await prisma.voucher.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedVouchers.count} test vouchers`);

  // 11. Delete test featured gallery items
  const deletedGalleryItems = await prisma.featuredGalleryItem.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(
    `Deleted ${deletedGalleryItems.count} test featured gallery items`,
  );

  // 12. Delete test MCP generation jobs
  const deletedMcpJobs = await prisma.mcpGenerationJob.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "e2e-" } },
        { userId: TEST_USER_ID },
      ],
    },
  });
  console.log(`Deleted ${deletedMcpJobs.count} test MCP generation jobs`);

  // 13. Delete test token transactions
  const deletedTransactions = await prisma.tokenTransaction.deleteMany({
    where: {
      userId: {
        in: [TEST_USER_ID, SECOND_USER_ID],
      },
    },
  });
  console.log(`Deleted ${deletedTransactions.count} test token transactions`);

  // 14. Reset token balance for test user
  await prisma.userTokenBalance.upsert({
    where: { userId: TEST_USER_ID },
    update: { balance: 100, lastRegeneration: new Date() },
    create: {
      userId: TEST_USER_ID,
      balance: 100,
      lastRegeneration: new Date(),
    },
  });
  console.log("Reset test user token balance to 100");

  // 15. Delete second test user (optional - can be recreated by seed)
  // Keeping second user for faster re-seeding

  console.log("\nE2E cleanup completed successfully!");
  console.log("\nPreserved:");
  console.log(`  Test User: ${TEST_USER_ID}`);
  console.log(`  Admin User: ${ADMIN_USER_ID}`);
  console.log(`  Second Test User: ${SECOND_USER_ID}`);
}

cleanup()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("E2E cleanup failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
