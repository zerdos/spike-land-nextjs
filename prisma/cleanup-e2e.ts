import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

/**
 * E2E Test Data Cleanup Script
 *
 * Resets test data to a clean state after E2E tests.
 * Preserves test users for auth but removes:
 * - Test orders and order items
 * - Test albums (except default ones)
 * - Test images
 * - Test enhancement jobs
 *
 * Usage:
 *   npx tsx prisma/cleanup-e2e.ts
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Test user IDs to preserve
const TEST_USER_ID = "test-user-id";
const ADMIN_USER_ID = "admin-user-id";

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

  // 6. Delete test images
  const deletedImages = await prisma.enhancedImage.deleteMany({
    where: {
      id: {
        startsWith: "e2e-",
      },
    },
  });
  console.log(`Deleted ${deletedImages.count} test images`);

  // 7. Delete enhancement jobs for test user
  const deletedJobs = await prisma.enhancementJob.deleteMany({
    where: {
      userId: TEST_USER_ID,
    },
  });
  console.log(`Deleted ${deletedJobs.count} test enhancement jobs`);

  // 8. Reset token balance for test user
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

  console.log("\nE2E cleanup completed successfully!");
  console.log("\nPreserved:");
  console.log(`  Test User: ${TEST_USER_ID}`);
  console.log(`  Admin User: ${ADMIN_USER_ID}`);
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
