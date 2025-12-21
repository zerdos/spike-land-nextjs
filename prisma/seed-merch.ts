import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding merch catalog...");

  // Create categories
  const categories = await Promise.all([
    prisma.merchCategory.upsert({
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
    }),
    prisma.merchCategory.upsert({
      where: { slug: "canvas" },
      update: {},
      create: {
        name: "Canvas",
        slug: "canvas",
        description: "Gallery-quality canvas prints with wooden frames",
        icon: "🎨",
        sortOrder: 2,
        isActive: true,
      },
    }),
    prisma.merchCategory.upsert({
      where: { slug: "apparel" },
      update: {},
      create: {
        name: "Apparel",
        slug: "apparel",
        description: "Custom printed clothing and accessories",
        icon: "👕",
        sortOrder: 3,
        isActive: true,
      },
    }),
    prisma.merchCategory.upsert({
      where: { slug: "home-decor" },
      update: {},
      create: {
        name: "Home Decor",
        slug: "home-decor",
        description: "Photo products for your home",
        icon: "🏠",
        sortOrder: 4,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // Create products
  const [prints, canvas, apparel, homeDecor] = categories;

  const products = await Promise.all([
    // Print products
    prisma.merchProduct.upsert({
      where: { id: "print-premium-lustre" },
      update: { mockupTemplate: null },
      create: {
        id: "print-premium-lustre",
        name: "Premium Lustre Print",
        description:
          "Museum-quality lustre finish print on archival paper. Vibrant colors with a subtle sheen.",
        categoryId: prints.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-FAP-A4",
        basePrice: 8.99,
        retailPrice: 24.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 1,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 2400,
        minHeight: 3300,
      },
    }),
    prisma.merchProduct.upsert({
      where: { id: "print-matte" },
      update: { mockupTemplate: null },
      create: {
        id: "print-matte",
        name: "Matte Photo Print",
        description: "Classic matte finish print perfect for framing. No glare, timeless look.",
        categoryId: prints.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-PHO-A4",
        basePrice: 6.99,
        retailPrice: 19.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 2,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 2400,
        minHeight: 3300,
      },
    }),

    // Canvas products
    prisma.merchProduct.upsert({
      where: { id: "canvas-stretched" },
      update: { mockupTemplate: null },
      create: {
        id: "canvas-stretched",
        name: "Stretched Canvas",
        description: "Gallery-wrapped canvas on solid wood stretcher bars. Ready to hang.",
        categoryId: canvas.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-CAN-12x16",
        basePrice: 18.99,
        retailPrice: 49.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 1,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 1800,
        minHeight: 2400,
      },
    }),
    prisma.merchProduct.upsert({
      where: { id: "canvas-framed" },
      update: { mockupTemplate: null },
      create: {
        id: "canvas-framed",
        name: "Framed Canvas",
        description: "Canvas print with elegant floating frame. The perfect centerpiece.",
        categoryId: canvas.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-CAN-FRAMED-12x16",
        basePrice: 32.99,
        retailPrice: 79.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 2,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 1800,
        minHeight: 2400,
      },
    }),

    // Apparel products
    prisma.merchProduct.upsert({
      where: { id: "tshirt-classic" },
      update: { mockupTemplate: null },
      create: {
        id: "tshirt-classic",
        name: "Classic T-Shirt",
        description: "Soft cotton t-shirt with full-front print. Comfortable everyday wear.",
        categoryId: apparel.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-APP-TSH",
        basePrice: 12.99,
        retailPrice: 29.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 1,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 3000,
        minHeight: 3000,
        printAreaWidth: 3000,
        printAreaHeight: 3000,
      },
    }),
    prisma.merchProduct.upsert({
      where: { id: "hoodie-premium" },
      update: { mockupTemplate: null },
      create: {
        id: "hoodie-premium",
        name: "Premium Hoodie",
        description: "Heavyweight hoodie with large back print. Warm and stylish.",
        categoryId: apparel.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-APP-HOD",
        basePrice: 28.99,
        retailPrice: 64.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 2,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 3600,
        minHeight: 4000,
        printAreaWidth: 3600,
        printAreaHeight: 4000,
      },
    }),

    // Home decor products
    prisma.merchProduct.upsert({
      where: { id: "cushion-square" },
      update: { mockupTemplate: null },
      create: {
        id: "cushion-square",
        name: "Photo Cushion",
        description: "Soft cushion with your photo printed on premium fabric. Includes insert.",
        categoryId: homeDecor.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-HOM-CUS-18",
        basePrice: 14.99,
        retailPrice: 34.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 1,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 2700,
        minHeight: 2700,
      },
    }),
    prisma.merchProduct.upsert({
      where: { id: "mug-ceramic" },
      update: { mockupTemplate: null },
      create: {
        id: "mug-ceramic",
        name: "Ceramic Photo Mug",
        description: "Wrap-around print on premium ceramic mug. Dishwasher and microwave safe.",
        categoryId: homeDecor.id,
        provider: "PRODIGI",
        providerSku: "GLOBAL-HOM-MUG-11",
        basePrice: 5.99,
        retailPrice: 16.99,
        currency: "GBP",
        isActive: true,
        sortOrder: 2,
        mockupTemplate: null,
        minDpi: 150,
        minWidth: 2100,
        minHeight: 900,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // Create variants for size/color options
  const variants = await Promise.all([
    // Print sizes
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
    prisma.merchVariant.upsert({
      where: { id: "print-premium-lustre-a2" },
      update: {},
      create: {
        id: "print-premium-lustre-a2",
        productId: "print-premium-lustre",
        name: 'A2 (16.5" x 23.4")',
        providerSku: "GLOBAL-FAP-A2",
        priceDelta: 25.0,
        isActive: true,
        attributes: { size: "A2", width: 420, height: 594 },
      },
    }),

    // T-shirt sizes
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
    prisma.merchVariant.upsert({
      where: { id: "tshirt-classic-xl" },
      update: {},
      create: {
        id: "tshirt-classic-xl",
        productId: "tshirt-classic",
        name: "X-Large",
        providerSku: "GLOBAL-APP-TSH-XL",
        priceDelta: 2.0,
        isActive: true,
        attributes: { size: "XL", chest: "46-48" },
      },
    }),

    // Canvas sizes
    prisma.merchVariant.upsert({
      where: { id: "canvas-stretched-12x16" },
      update: {},
      create: {
        id: "canvas-stretched-12x16",
        productId: "canvas-stretched",
        name: '12" x 16"',
        providerSku: "GLOBAL-CAN-12x16",
        priceDelta: 0,
        isActive: true,
        attributes: { width: 12, height: 16 },
      },
    }),
    prisma.merchVariant.upsert({
      where: { id: "canvas-stretched-16x20" },
      update: {},
      create: {
        id: "canvas-stretched-16x20",
        productId: "canvas-stretched",
        name: '16" x 20"',
        providerSku: "GLOBAL-CAN-16x20",
        priceDelta: 15.0,
        isActive: true,
        attributes: { width: 16, height: 20 },
      },
    }),
    prisma.merchVariant.upsert({
      where: { id: "canvas-stretched-24x36" },
      update: {},
      create: {
        id: "canvas-stretched-24x36",
        productId: "canvas-stretched",
        name: '24" x 36"',
        providerSku: "GLOBAL-CAN-24x36",
        priceDelta: 40.0,
        isActive: true,
        attributes: { width: 24, height: 36 },
      },
    }),
  ]);

  console.log(`Created ${variants.length} product variants`);
  console.log("Merch catalog seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error seeding merch catalog:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
