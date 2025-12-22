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

  // 1b. Create/update admin user
  const ADMIN_USER_ID = "admin-user-id";
  const ADMIN_USER_EMAIL = "admin@example.com";
  const adminUser = await prisma.user.upsert({
    where: { id: ADMIN_USER_ID },
    update: {
      name: "Admin User",
      email: ADMIN_USER_EMAIL,
      role: "ADMIN",
    },
    create: {
      id: ADMIN_USER_ID,
      name: "Admin User",
      email: ADMIN_USER_EMAIL,
      emailVerified: new Date(),
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", adminUser.id);

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
    const image = testImages[i];
    if (!image) continue;
    await prisma.albumImage.upsert({
      where: {
        albumId_imageId: {
          albumId: unlistedAlbum.id,
          imageId: image.id,
        },
      },
      update: { sortOrder: i },
      create: {
        albumId: unlistedAlbum.id,
        imageId: image.id,
        sortOrder: i,
      },
    });
  }
  console.log(`Added ${testImages.length} images to unlisted album`);

  // Add first 2 images to private album
  for (let i = 0; i < 2; i++) {
    const image = testImages[i];
    if (!image) continue;
    await prisma.albumImage.upsert({
      where: {
        albumId_imageId: {
          albumId: privateAlbum.id,
          imageId: image.id,
        },
      },
      update: { sortOrder: i },
      create: {
        albumId: privateAlbum.id,
        imageId: image.id,
        sortOrder: i,
      },
    });
  }
  console.log("Added 2 images to private album");

  // 7. Create test merch orders for order history tests
  // First check if merch products exist
  const tshirtProduct = await prisma.merchProduct.findUnique({
    where: { id: "tshirt-classic" },
  });

  if (tshirtProduct) {
    console.log("Creating test orders...");

    // Create order with PENDING status
    const pendingOrder = await prisma.merchOrder.upsert({
      where: { id: "e2e-order-pending" },
      update: {},
      create: {
        id: "e2e-order-pending",
        userId: TEST_USER_ID,
        orderNumber: "SL-E2E-001",
        status: "PENDING",
        subtotal: 29.99,
        shippingCost: 4.99,
        taxAmount: 0,
        totalAmount: 34.98,
        currency: "GBP",
        customerEmail: TEST_USER_EMAIL,
        shippingAddress: {
          name: "Test User",
          line1: "123 Test Street",
          city: "London",
          postalCode: "SW1A 1AA",
          countryCode: "GB",
        },
      },
    });

    // Create order item for pending order
    await prisma.merchOrderItem.upsert({
      where: { id: "e2e-order-pending-item-1" },
      update: {},
      create: {
        id: "e2e-order-pending-item-1",
        orderId: pendingOrder.id,
        productId: "tshirt-classic",
        variantId: "tshirt-classic-m",
        productName: "Classic T-Shirt",
        variantName: "Medium",
        imageUrl: "https://placehold.co/400x400/333/white?text=TShirt",
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
      },
    });

    // Create order with PAID status
    const paidOrder = await prisma.merchOrder.upsert({
      where: { id: "e2e-order-paid" },
      update: {},
      create: {
        id: "e2e-order-paid",
        userId: TEST_USER_ID,
        orderNumber: "SL-E2E-002",
        status: "PAID",
        subtotal: 79.99,
        shippingCost: 0,
        taxAmount: 0,
        totalAmount: 79.99,
        currency: "GBP",
        customerEmail: TEST_USER_EMAIL,
        shippingAddress: {
          name: "Test User",
          line1: "456 Another Street",
          city: "Manchester",
          postalCode: "M1 1AA",
          countryCode: "GB",
        },
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    });

    // Create order items for paid order (2 items)
    await prisma.merchOrderItem.upsert({
      where: { id: "e2e-order-paid-item-1" },
      update: {},
      create: {
        id: "e2e-order-paid-item-1",
        orderId: paidOrder.id,
        productId: "canvas-stretched",
        variantId: "canvas-stretched-12x16",
        productName: "Stretched Canvas",
        variantName: '12" x 16"',
        imageUrl: "https://placehold.co/400x400/333/white?text=Canvas",
        quantity: 1,
        unitPrice: 49.99,
        totalPrice: 49.99,
      },
    });
    await prisma.merchOrderItem.upsert({
      where: { id: "e2e-order-paid-item-2" },
      update: {},
      create: {
        id: "e2e-order-paid-item-2",
        orderId: paidOrder.id,
        productId: "tshirt-classic",
        variantId: "tshirt-classic-l",
        productName: "Classic T-Shirt",
        variantName: "Large",
        imageUrl: "https://placehold.co/400x400/333/white?text=TShirt+L",
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
      },
    });

    // Create order with SHIPPED status
    const shippedOrder = await prisma.merchOrder.upsert({
      where: { id: "e2e-order-shipped" },
      update: {},
      create: {
        id: "e2e-order-shipped",
        userId: TEST_USER_ID,
        orderNumber: "SL-E2E-003",
        status: "SHIPPED",
        subtotal: 49.99,
        shippingCost: 4.99,
        taxAmount: 0,
        totalAmount: 54.98,
        currency: "GBP",
        customerEmail: TEST_USER_EMAIL,
        shippingAddress: {
          name: "Test User",
          line1: "789 Third Avenue",
          city: "Birmingham",
          postalCode: "B1 1AA",
          countryCode: "GB",
        },
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
    });

    // Create order item for shipped order
    await prisma.merchOrderItem.upsert({
      where: { id: "e2e-order-shipped-item-1" },
      update: {},
      create: {
        id: "e2e-order-shipped-item-1",
        orderId: shippedOrder.id,
        productId: "canvas-stretched",
        variantId: "canvas-stretched-16x20",
        productName: "Stretched Canvas",
        variantName: '16" x 20"',
        imageUrl: "https://placehold.co/400x400/333/white?text=Canvas+16x20",
        quantity: 1,
        unitPrice: 64.99,
        totalPrice: 64.99,
      },
    });

    // Create shipment for shipped order
    await prisma.merchShipment.upsert({
      where: { id: "e2e-shipment-1" },
      update: {},
      create: {
        id: "e2e-shipment-1",
        orderId: shippedOrder.id,
        carrier: "Royal Mail",
        trackingNumber: "RM123456789GB",
        trackingUrl: "https://www.royalmail.com/track-your-item",
        status: "IN_TRANSIT",
        shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    });

    console.log("Created 3 test orders (PENDING, PAID, SHIPPED)");
  } else {
    console.log("Skipping order creation - run seed-merch.ts first to create products");
  }

  console.log("\nE2E seed completed successfully!");
  console.log("\nTest data created:");
  console.log(`  User ID: ${TEST_USER_ID}`);
  console.log(`  User Email: ${TEST_USER_EMAIL}`);
  console.log(
    `  Unlisted Album: /canvas/${unlistedAlbum.id}?token=${unlistedAlbum.shareToken}`,
  );
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
