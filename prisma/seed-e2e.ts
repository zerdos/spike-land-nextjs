import { PrismaPg } from "@prisma/adapter-pg";
import {
  AlbumPrivacy,
  EnhancementTier,
  ExternalAgentStatus,
  FeedbackStatus,
  FeedbackType,
  GalleryCategory,
  JobStatus,
  PrismaClient,
  VoucherStatus,
  VoucherType,
} from "@prisma/client";
import { createHash } from "crypto";
import { config } from "dotenv";

import { getE2EDatabaseUrl } from "./lib/db-protection";

// Load environment variables from .env.local
// Use quiet: true to suppress verbose logging in CI
config({ path: ".env.local", quiet: true });

/**
 * E2E Test Data Seed Script
 *
 * Creates comprehensive test data for E2E tests including:
 * - Test users (standard and admin, matching auth bypass IDs)
 * - Albums with images for canvas display tests
 * - Token balance for test users
 * - Enhancement jobs (PENDING, PROCESSING, COMPLETED, FAILED)
 * - API keys for MCP tests
 * - Vouchers for token/referral tests
 * - Featured gallery items
 *
 * Usage:
 *   npx tsx prisma/seed-e2e.ts
 *   DATABASE_URL_E2E=<url> npx tsx prisma/seed-e2e.ts
 *
 * IMPORTANT: The user ID must match the one in src/auth.ts E2E bypass:
 *   id: "test-user-id"
 *
 * This script is idempotent - safe to run multiple times.
 * All test data IDs are prefixed with "e2e-" for easy identification.
 *
 * SAFETY: This script has production database protection.
 * It will refuse to run against production databases.
 * See prisma/lib/db-protection.ts for details.
 */

// Get connection string with production protection
const connectionString = getE2EDatabaseUrl();

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Must match the ID in src/auth.ts E2E_BYPASS_AUTH
const TEST_USER_ID = "test-user-id";
const TEST_USER_EMAIL = "test@example.com";

// Additional test users for ownership/permission tests
const SECOND_USER_ID = "e2e-second-user-id";
const SECOND_USER_EMAIL = "second-test@example.com";

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
  // First image has shareToken for share page tests
  const testImages = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.enhancedImage.upsert({
        where: { id: `e2e-test-image-${i + 1}` },
        update: {
          // Update shareToken for first image if it already exists
          ...(i === 0 ? { shareToken: "e2e-share-token-123" } : {}),
        },
        create: {
          id: `e2e-test-image-${i + 1}`,
          userId: TEST_USER_ID,
          name: `E2E Test Image ${i + 1}.jpg`,
          originalUrl: `https://placehold.co/800x600/333/white.png?text=E2E+Image+${i + 1}`,
          originalR2Key: `e2e-test/image-${i + 1}.jpg`,
          originalWidth: 800,
          originalHeight: 600,
          originalSizeBytes: 50000,
          originalFormat: "jpeg",
          isPublic: false,
          // First image gets shareToken for share page tests
          ...(i === 0 ? { shareToken: "e2e-share-token-123" } : {}),
        },
      })),
  );
  console.log(`Created ${testImages.length} test images`);

  // 4. Create UNLISTED album with images (for canvas tests)
  // Note: Album uses different share token than EnhancedImage for separate test scenarios
  const unlistedAlbum = await prisma.album.upsert({
    where: { id: "e2e-unlisted-album" },
    update: {
      shareToken: "e2e-album-share-token-456",
    },
    create: {
      id: "e2e-unlisted-album",
      userId: TEST_USER_ID,
      name: "E2E Test Album",
      description: "Album for E2E canvas display tests",
      privacy: AlbumPrivacy.UNLISTED,
      shareToken: "e2e-album-share-token-456",
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

  // 7. Create second test user for ownership tests
  const secondUser = await prisma.user.upsert({
    where: { id: SECOND_USER_ID },
    update: {
      name: "Second Test User",
      email: SECOND_USER_EMAIL,
    },
    create: {
      id: SECOND_USER_ID,
      name: "Second Test User",
      email: SECOND_USER_EMAIL,
      emailVerified: new Date(),
    },
  });
  console.log("Created second test user:", secondUser.id);

  // 8. Create enhancement jobs in various states
  const jobStatuses: {
    id: string;
    status: JobStatus;
    tier: EnhancementTier;
  }[] = [
    {
      id: "e2e-job-pending",
      status: JobStatus.PENDING,
      tier: EnhancementTier.TIER_1K,
    },
    {
      id: "e2e-job-processing",
      status: JobStatus.PROCESSING,
      tier: EnhancementTier.TIER_2K,
    },
    {
      id: "e2e-job-completed",
      status: JobStatus.COMPLETED,
      tier: EnhancementTier.TIER_4K,
    },
    {
      id: "e2e-job-failed",
      status: JobStatus.FAILED,
      tier: EnhancementTier.TIER_1K,
    },
  ];

  for (const jobConfig of jobStatuses) {
    await prisma.imageEnhancementJob.upsert({
      where: { id: jobConfig.id },
      update: { status: jobConfig.status },
      create: {
        id: jobConfig.id,
        imageId: "e2e-test-image-1",
        userId: TEST_USER_ID,
        tier: jobConfig.tier,
        tokensCost: jobConfig.tier === EnhancementTier.TIER_1K
          ? 2
          : jobConfig.tier === EnhancementTier.TIER_2K
          ? 5
          : 10,
        status: jobConfig.status,
        geminiPrompt: `E2E test enhancement job in ${jobConfig.status} state`,
        geminiModel: "gemini-2.0-flash-preview-image-generation",
        processingStartedAt: jobConfig.status !== JobStatus.PENDING
          ? new Date()
          : null,
        processingCompletedAt: jobConfig.status === JobStatus.COMPLETED
          ? new Date()
          : null,
        enhancedUrl: jobConfig.status === JobStatus.COMPLETED
          ? "https://placehold.co/2048x1536/333/white.png?text=Enhanced"
          : null,
        enhancedR2Key: jobConfig.status === JobStatus.COMPLETED
          ? "e2e-test/enhanced-1.jpg"
          : null,
        enhancedWidth: jobConfig.status === JobStatus.COMPLETED ? 2048 : null,
        enhancedHeight: jobConfig.status === JobStatus.COMPLETED ? 1536 : null,
        errorMessage: jobConfig.status === JobStatus.FAILED
          ? "E2E test failure message"
          : null,
      },
    });
  }
  console.log(
    "Created 4 enhancement jobs (PENDING, PROCESSING, COMPLETED, FAILED)",
  );

  // 9. Create API keys for MCP tests
  const apiKeyPlaintext = "e2e-test-api-key-12345";
  const apiKeyHash = createHash("sha256").update(apiKeyPlaintext).digest("hex");
  await prisma.apiKey.upsert({
    where: { id: "e2e-api-key-1" },
    update: {},
    create: {
      id: "e2e-api-key-1",
      userId: TEST_USER_ID,
      name: "E2E Test API Key",
      keyHash: apiKeyHash,
      keyPrefix: "e2e-test",
      isActive: true,
    },
  });
  console.log("Created API key for MCP tests");

  // 10. Create vouchers for token/referral tests
  await prisma.voucher.upsert({
    where: { id: "e2e-voucher-active" },
    update: {},
    create: {
      id: "e2e-voucher-active",
      code: "E2E-ACTIVE-100",
      type: VoucherType.FIXED_TOKENS,
      value: 100,
      maxUses: 10,
      currentUses: 0,
      status: VoucherStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  await prisma.voucher.upsert({
    where: { id: "e2e-voucher-expired" },
    update: {},
    create: {
      id: "e2e-voucher-expired",
      code: "E2E-EXPIRED-50",
      type: VoucherType.FIXED_TOKENS,
      value: 50,
      maxUses: 5,
      currentUses: 5,
      status: VoucherStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  });

  await prisma.voucher.upsert({
    where: { id: "e2e-voucher-bonus" },
    update: {},
    create: {
      id: "e2e-voucher-bonus",
      code: "E2E-BONUS-20",
      type: VoucherType.PERCENTAGE_BONUS,
      value: 20, // 20% bonus
      status: VoucherStatus.ACTIVE,
    },
  });
  console.log("Created 3 vouchers (active, expired, bonus)");

  // 11. Create featured gallery items
  await prisma.featuredGalleryItem.upsert({
    where: { id: "e2e-gallery-item-1" },
    update: {},
    create: {
      id: "e2e-gallery-item-1",
      title: "E2E Test Portrait",
      description: "A beautiful AI-enhanced portrait for E2E testing",
      category: GalleryCategory.PORTRAIT,
      originalUrl: "https://placehold.co/800x1200/333/white.png?text=Original+Portrait",
      enhancedUrl: "https://placehold.co/2048x3072/333/white.png?text=Enhanced+Portrait",
      width: 2,
      height: 3,
      sortOrder: 0,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  await prisma.featuredGalleryItem.upsert({
    where: { id: "e2e-gallery-item-2" },
    update: {},
    create: {
      id: "e2e-gallery-item-2",
      title: "E2E Test Landscape",
      description: "A stunning AI-enhanced landscape for E2E testing",
      category: GalleryCategory.LANDSCAPE,
      originalUrl: "https://placehold.co/1200x800/333/white.png?text=Original+Landscape",
      enhancedUrl: "https://placehold.co/3072x2048/333/white.png?text=Enhanced+Landscape",
      width: 3,
      height: 2,
      sortOrder: 1,
      isActive: true,
      createdBy: adminUser.id,
    },
  });
  console.log("Created 2 featured gallery items");

  // 11.5. Seed merch catalog for E2E tests
  // Categories
  const printsCategory = await prisma.merchCategory.upsert({
    where: { slug: "prints" },
    update: {},
    create: {
      name: "Prints",
      slug: "prints",
      description: "High-quality photo prints on premium paper",
      icon: "🖼️",
      sortOrder: 1,
      isActive: true,
    },
  });

  const apparelCategory = await prisma.merchCategory.upsert({
    where: { slug: "apparel" },
    update: {},
    create: {
      name: "Apparel",
      slug: "apparel",
      description: "Custom printed clothing and accessories",
      icon: "👕",
      sortOrder: 2,
      isActive: true,
    },
  });

  // Products
  await prisma.merchProduct.upsert({
    where: { id: "print-premium-lustre" },
    update: {},
    create: {
      id: "print-premium-lustre",
      name: "Premium Lustre Print",
      description: "Museum-quality lustre finish print on archival paper.",
      categoryId: printsCategory.id,
      provider: "PRODIGI",
      providerSku: "GLOBAL-FAP-A4",
      basePrice: 8.99,
      retailPrice: 24.99,
      currency: "GBP",
      isActive: true,
      sortOrder: 1,
      minDpi: 150,
      minWidth: 2400,
      minHeight: 3300,
    },
  });

  await prisma.merchProduct.upsert({
    where: { id: "tshirt-classic" },
    update: {},
    create: {
      id: "tshirt-classic",
      name: "Classic T-Shirt",
      description: "Soft cotton t-shirt with full-front print.",
      categoryId: apparelCategory.id,
      provider: "PRODIGI",
      providerSku: "GLOBAL-APP-TSH",
      basePrice: 12.99,
      retailPrice: 29.99,
      currency: "GBP",
      isActive: true,
      sortOrder: 1,
      minDpi: 150,
      minWidth: 3000,
      minHeight: 3000,
      printAreaWidth: 3000,
      printAreaHeight: 3000,
    },
  });

  // Variants for t-shirt
  await Promise.all([
    prisma.merchVariant.upsert({
      where: { id: "tshirt-classic-s" },
      update: {},
      create: {
        id: "tshirt-classic-s",
        productId: "tshirt-classic",
        name: "Small",
        providerSku: "GLOBAL-APP-TSH-S",
        priceDelta: 0,
        isActive: true,
        attributes: { size: "S", chest: "34-36" },
      },
    }),
    prisma.merchVariant.upsert({
      where: { id: "tshirt-classic-m" },
      update: {},
      create: {
        id: "tshirt-classic-m",
        productId: "tshirt-classic",
        name: "Medium",
        providerSku: "GLOBAL-APP-TSH-M",
        priceDelta: 0,
        isActive: true,
        attributes: { size: "M", chest: "38-40" },
      },
    }),
    prisma.merchVariant.upsert({
      where: { id: "tshirt-classic-l" },
      update: {},
      create: {
        id: "tshirt-classic-l",
        productId: "tshirt-classic",
        name: "Large",
        providerSku: "GLOBAL-APP-TSH-L",
        priceDelta: 0,
        isActive: true,
        attributes: { size: "L", chest: "42-44" },
      },
    }),
  ]);

  // Variants for print
  await Promise.all([
    prisma.merchVariant.upsert({
      where: { id: "print-premium-lustre-a4" },
      update: {},
      create: {
        id: "print-premium-lustre-a4",
        productId: "print-premium-lustre",
        name: 'A4 (8.3" x 11.7")',
        providerSku: "GLOBAL-FAP-A4",
        priceDelta: 0,
        isActive: true,
        attributes: { size: "A4", width: 210, height: 297 },
      },
    }),
    prisma.merchVariant.upsert({
      where: { id: "print-premium-lustre-a3" },
      update: {},
      create: {
        id: "print-premium-lustre-a3",
        productId: "print-premium-lustre",
        name: 'A3 (11.7" x 16.5")',
        providerSku: "GLOBAL-FAP-A3",
        priceDelta: 12.0,
        isActive: true,
        attributes: { size: "A3", width: 297, height: 420 },
      },
    }),
  ]);

  console.log("Created 2 merch categories, 2 products, 5 variants for E2E tests");

  // 12. Create external agent sessions for admin agents dashboard tests
  // Create session with AWAITING_PLAN_APPROVAL status (for approve button test)
  await prisma.externalAgentSession.upsert({
    where: { id: "e2e-agent-session-awaiting" },
    update: {
      status: ExternalAgentStatus.AWAITING_PLAN_APPROVAL,
      planSummary:
        "E2E test plan: Fix the authentication bug by updating the token validation logic",
    },
    create: {
      id: "e2e-agent-session-awaiting",
      externalId: "sessions/e2e-awaiting-123",
      provider: "JULES",
      name: "E2E Test: Fix Auth Bug",
      description: "Automated test session awaiting plan approval",
      status: ExternalAgentStatus.AWAITING_PLAN_APPROVAL,
      sourceRepo: "zerdos/spike-land-nextjs",
      startingBranch: "main",
      planSummary:
        "E2E test plan: Fix the authentication bug by updating the token validation logic",
    },
  });

  // Create session with IN_PROGRESS status
  await prisma.externalAgentSession.upsert({
    where: { id: "e2e-agent-session-progress" },
    update: {
      status: ExternalAgentStatus.IN_PROGRESS,
    },
    create: {
      id: "e2e-agent-session-progress",
      externalId: "sessions/e2e-progress-456",
      provider: "JULES",
      name: "E2E Test: Add Unit Tests",
      description: "Automated test session in progress",
      status: ExternalAgentStatus.IN_PROGRESS,
      sourceRepo: "zerdos/spike-land-nextjs",
      startingBranch: "main",
      planSummary: "Adding comprehensive unit tests for the user service",
      planApprovedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
  });

  // Create activity for the in-progress session
  await prisma.agentSessionActivity.upsert({
    where: { id: "e2e-agent-activity-1" },
    update: {},
    create: {
      id: "e2e-agent-activity-1",
      sessionId: "e2e-agent-session-progress",
      externalId: "activity-1",
      type: "code_committed",
      content: "Committed test files for user service",
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    },
  });
  console.log("Created 2 external agent sessions for admin dashboard tests");

  // 13. Create feedback items for admin feedback management tests
  const feedbackItems = [
    {
      id: "e2e-feedback-1",
      type: FeedbackType.BUG,
      status: FeedbackStatus.NEW,
      message: "App crashes when uploading large images",
      page: "/apps/pixel",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    {
      id: "e2e-feedback-2",
      type: FeedbackType.IDEA,
      status: FeedbackStatus.REVIEWED,
      message: "Would be great to have dark mode support",
      page: "/settings",
    },
    {
      id: "e2e-feedback-3",
      type: FeedbackType.OTHER,
      status: FeedbackStatus.RESOLVED,
      message: "General feedback about the user experience",
      page: "/",
    },
    {
      id: "e2e-feedback-4",
      type: FeedbackType.BUG,
      status: FeedbackStatus.DISMISSED,
      message: "Minor UI glitch in sidebar",
      page: "/admin",
    },
    {
      id: "e2e-feedback-5",
      type: FeedbackType.IDEA,
      status: FeedbackStatus.NEW,
      message: "Add batch processing for multiple images",
      page: "/apps/pixel",
    },
  ];

  for (const fb of feedbackItems) {
    await prisma.feedback.upsert({
      where: { id: fb.id },
      update: {
        status: fb.status,
        type: fb.type,
      },
      create: {
        id: fb.id,
        userId: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        type: fb.type,
        message: fb.message,
        page: fb.page,
        userAgent: fb.userAgent || null,
        status: fb.status,
      },
    });
  }
  console.log(`Created ${feedbackItems.length} feedback items for admin tests`);

  // 14. Create test merch orders for order history tests
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
        imageUrl: "https://placehold.co/400x400/333/white.png?text=TShirt",
        imageR2Key: "e2e/tshirt-classic.png",
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
        productId: "print-premium-lustre",
        variantId: "print-premium-lustre-a4",
        productName: "Premium Lustre Print",
        variantName: "A4",
        imageUrl: "https://placehold.co/400x400/333/white.png?text=Print+A4",
        imageR2Key: "e2e/print-a4.png",
        quantity: 1,
        unitPrice: 19.99,
        totalPrice: 19.99,
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
        imageUrl: "https://placehold.co/400x400/333/white.png?text=TShirt+L",
        imageR2Key: "e2e/tshirt-classic-l.png",
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
        productId: "print-premium-lustre",
        variantId: "print-premium-lustre-a3",
        productName: "Premium Lustre Print",
        variantName: "A3",
        imageUrl: "https://placehold.co/400x400/333/white.png?text=Print+A3",
        imageR2Key: "e2e/print-a3.png",
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
      },
    });

    // Create shipment for shipped order
    await prisma.merchShipment.upsert({
      where: { id: "e2e-shipment-1" },
      update: {},
      create: {
        id: "e2e-shipment-1",
        orderId: shippedOrder.id,
        provider: "PRODIGI",
        carrier: "Royal Mail",
        trackingNumber: "RM123456789GB",
        trackingUrl: "https://www.royalmail.com/track-your-item",
        status: "IN_TRANSIT",
        shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    });

    console.log("Created 3 test orders (PENDING, PAID, SHIPPED)");
  } else {
    console.log(
      "Skipping order creation - run seed-merch.ts first to create products",
    );
  }

  console.log("\nE2E seed completed successfully!");
  console.log("\nTest data created:");
  console.log(`  Primary Test User ID: ${TEST_USER_ID}`);
  console.log(`  Primary Test User Email: ${TEST_USER_EMAIL}`);
  console.log(`  Second Test User ID: ${SECOND_USER_ID}`);
  console.log(`  Admin User ID: admin-user-id`);
  console.log(
    `  Unlisted Album: /canvas/${unlistedAlbum.id}?token=${unlistedAlbum.shareToken}`,
  );
  console.log(`  Private Album: /albums/${privateAlbum.id}`);
  console.log(`  Token Balance: 100`);
  console.log(`  Enhancement Jobs: 4 (PENDING, PROCESSING, COMPLETED, FAILED)`);
  console.log(`  API Keys: 1 (for MCP tests)`);
  console.log(`  Vouchers: 3 (active, expired, bonus)`);
  console.log(`  Featured Gallery Items: 2`);
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
