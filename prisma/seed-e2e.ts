import { PrismaPg } from "@prisma/adapter-pg";
import { AlbumPrivacy, PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

/**
 * E2E Test Data Seed Script
 *
 * Creates test data for E2E tests including:
 * - Test user (matching auth bypass ID)
 * - Albums with images for canvas display tests
 * - Token balance for the test user
 *
 * Usage:
 *   npx tsx prisma/seed-e2e.ts
 *
 * IMPORTANT: The user ID must match the one in src/auth.ts E2E bypass:
 *   id: "test-user-id"
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Must match the ID in src/auth.ts E2E_BYPASS_AUTH
const TEST_USER_ID = "test-user-id";
const TEST_USER_EMAIL = "test@example.com";

async function main() {
  console.log("Starting E2E seed...");

  // 1. Create/update test user
  const testUser = await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {
      name: "Test User",
      email: TEST_USER_EMAIL,
    },
    create: {
      id: TEST_USER_ID,
      name: "Test User",
      email: TEST_USER_EMAIL,
      emailVerified: new Date(),
    },
  });
  console.log("Created test user:", testUser.id);

  // 2. Ensure test user has token balance
  await prisma.userTokenBalance.upsert({
    where: { userId: TEST_USER_ID },
    update: { balance: 100 },
    create: {
      userId: TEST_USER_ID,
      balance: 100,
      lastRegeneration: new Date(),
    },
  });
  console.log("Set token balance: 100");

  // 3. Create test images (using placeholder URLs)
  const testImages = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.enhancedImage.upsert({
        where: { id: `e2e-test-image-${i + 1}` },
        update: {},
        create: {
          id: `e2e-test-image-${i + 1}`,
          userId: TEST_USER_ID,
          name: `E2E Test Image ${i + 1}.jpg`,
          originalUrl: `https://placehold.co/800x600/333/white?text=E2E+Image+${i + 1}`,
          originalR2Key: `e2e-test/image-${i + 1}.jpg`,
          originalWidth: 800,
          originalHeight: 600,
          originalSizeBytes: 50000,
          originalFormat: "jpeg",
          isPublic: false,
        },
      })),
  );
  console.log(`Created ${testImages.length} test images`);

  // 4. Create UNLISTED album with images (for canvas tests)
  const unlistedAlbum = await prisma.album.upsert({
    where: { id: "e2e-unlisted-album" },
    update: {
      shareToken: "e2e-share-token-123",
    },
    create: {
      id: "e2e-unlisted-album",
      userId: TEST_USER_ID,
      name: "E2E Test Album",
      description: "Album for E2E canvas display tests",
      privacy: AlbumPrivacy.UNLISTED,
      shareToken: "e2e-share-token-123",
    },
  });
  console.log("Created UNLISTED album:", unlistedAlbum.id);

  // 5. Create PRIVATE album (for private album tests)
  const privateAlbum = await prisma.album.upsert({
    where: { id: "e2e-private-album" },
    update: {},
    create: {
      id: "e2e-private-album",
      userId: TEST_USER_ID,
      name: "E2E Private Album",
      description: "Private album for E2E tests",
      privacy: AlbumPrivacy.PRIVATE,
    },
  });
  console.log("Created PRIVATE album:", privateAlbum.id);

  // 6. Link images to albums
  // Add all images to unlisted album
  for (let i = 0; i < testImages.length; i++) {
    await prisma.albumImage.upsert({
      where: {
        albumId_imageId: {
          albumId: unlistedAlbum.id,
          imageId: testImages[i].id,
        },
      },
      update: { sortOrder: i },
      create: {
        albumId: unlistedAlbum.id,
        imageId: testImages[i].id,
        sortOrder: i,
      },
    });
  }
  console.log(`Added ${testImages.length} images to unlisted album`);

  // Add first 2 images to private album
  for (let i = 0; i < 2; i++) {
    await prisma.albumImage.upsert({
      where: {
        albumId_imageId: {
          albumId: privateAlbum.id,
          imageId: testImages[i].id,
        },
      },
      update: { sortOrder: i },
      create: {
        albumId: privateAlbum.id,
        imageId: testImages[i].id,
        sortOrder: i,
      },
    });
  }
  console.log("Added 2 images to private album");

  console.log("\nE2E seed completed successfully!");
  console.log("\nTest data created:");
  console.log(`  User ID: ${TEST_USER_ID}`);
  console.log(`  User Email: ${TEST_USER_EMAIL}`);
  console.log(`  Unlisted Album: /canvas/${unlistedAlbum.id}?token=${unlistedAlbum.shareToken}`);
  console.log(`  Private Album: /albums/${privateAlbum.id}`);
  console.log(`  Token Balance: 100`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("E2E seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
