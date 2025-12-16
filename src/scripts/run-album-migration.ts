/**
 * One-time migration script to ensure all users have default albums
 * and move orphaned images to private galleries.
 *
 * Run with: npx tsx src/scripts/run-album-migration.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file
config({ path: resolve(process.cwd(), ".env.local") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PRIVATE_ALBUM = {
  name: "Private Gallery",
  privacy: "PRIVATE" as const,
  defaultTier: "TIER_1K" as const,
  description: "My private photos",
};

const DEFAULT_PUBLIC_ALBUM = {
  name: "Public Gallery",
  privacy: "PUBLIC" as const,
  defaultTier: "TIER_1K" as const,
  description: "My public enhancements",
};

async function main() {
  console.log("Starting album migration...\n");

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  console.log(`Found ${users.length} users to process\n`);

  let privateAlbumsCreated = 0;
  let publicAlbumsCreated = 0;
  let imagesMovedTotal = 0;

  for (const user of users) {
    console.log(`Processing user: ${user.email || user.id}`);

    // Get user's existing albums
    const existingAlbums = await prisma.album.findMany({
      where: { userId: user.id },
    });

    const hasPrivate = existingAlbums.some(
      (a) => a.privacy === "PRIVATE" && a.name === DEFAULT_PRIVATE_ALBUM.name,
    );
    const hasPublic = existingAlbums.some(
      (a) => a.privacy === "PUBLIC" && a.name === DEFAULT_PUBLIC_ALBUM.name,
    );

    // Create private album if missing
    let privateAlbum = existingAlbums.find(
      (a) => a.privacy === "PRIVATE" && a.name === DEFAULT_PRIVATE_ALBUM.name,
    );

    if (!hasPrivate) {
      privateAlbum = await prisma.album.create({
        data: {
          userId: user.id,
          ...DEFAULT_PRIVATE_ALBUM,
        },
      });
      privateAlbumsCreated++;
      console.log(`  Created Private Gallery`);
    }

    // Create public album if missing
    if (!hasPublic) {
      await prisma.album.create({
        data: {
          userId: user.id,
          ...DEFAULT_PUBLIC_ALBUM,
        },
      });
      publicAlbumsCreated++;
      console.log(`  Created Public Gallery`);
    }

    // Find orphaned images (not in any album)
    const orphanedImages = await prisma.enhancedImage.findMany({
      where: {
        userId: user.id,
        albumImages: {
          none: {},
        },
      },
      select: { id: true, name: true },
    });

    if (orphanedImages.length > 0 && privateAlbum) {
      // Get the current max sort order in the private album
      const maxSortOrder = await prisma.albumImage.aggregate({
        where: { albumId: privateAlbum.id },
        _max: { sortOrder: true },
      });

      let currentSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

      // Add orphaned images to private album
      await prisma.albumImage.createMany({
        data: orphanedImages.map((img) => ({
          albumId: privateAlbum!.id,
          imageId: img.id,
          sortOrder: currentSortOrder++,
        })),
        skipDuplicates: true,
      });

      console.log(`  Moved ${orphanedImages.length} orphaned images to Private Gallery`);
      imagesMovedTotal += orphanedImages.length;
    }
  }

  console.log("\n--- Migration Complete ---");
  console.log(`Private albums created: ${privateAlbumsCreated}`);
  console.log(`Public albums created: ${publicAlbumsCreated}`);
  console.log(`Orphaned images moved: ${imagesMovedTotal}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
