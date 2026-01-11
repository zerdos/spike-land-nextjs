#!/usr/bin/env npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Restore Script
 *
 * Restores data from JSON backup files to a database.
 * WARNING: This will INSERT data into the target database.
 * Use with caution and only on empty or test databases.
 *
 * Usage:
 *   npx tsx prisma/scripts/restore-database.ts --from ./prisma/backups/backup-2024-01-10
 *   DATABASE_URL=<target_url> npx tsx prisma/scripts/restore-database.ts --from ./backup-dir
 *
 * The script will:
 * 1. Read all JSON files from the backup directory
 * 2. Insert data in the correct order (respecting foreign keys)
 * 3. Skip records that already exist (using upsert where possible)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { assertE2EDatabase } from "../lib/db-protection";

// Load environment variables
config({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// Safety check - don't restore to production!
assertE2EDatabase(connectionString);

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Parse command line arguments
const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
if (fromIndex === -1 || !args[fromIndex + 1]) {
  console.error("Usage: npx tsx prisma/scripts/restore-database.ts --from <backup-directory>");
  process.exit(1);
}
const backupDir = args[fromIndex + 1] ?? "./prisma/backups/latest";

function loadBackupFile<T>(filename: string): T[] {
  const filePath = join(backupDir, `${filename}.json`);
  if (!existsSync(filePath)) {
    console.log(`   ⚠️  ${filename}.json not found, skipping`);
    return [];
  }
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

async function restore() {
  console.log(`\n📦 Starting database restore...`);
  console.log(`📁 From: ${backupDir}\n`);

  if (!existsSync(backupDir)) {
    console.error(`❌ Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  // Restore in order of dependencies (parents before children)
  const restoreOrder = [
    {
      name: "users",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>("users");
        let count = 0;
        for (const record of data) {
          try {
            await prisma.user.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  User ${record.id}: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "user_token_balances",
      restore: async () => {
        const data = loadBackupFile<{ userId: string; [key: string]: unknown; }>(
          "user_token_balances",
        );
        let count = 0;
        for (const record of data) {
          try {
            await prisma.userTokenBalance.upsert({
              where: { userId: record.userId },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  TokenBalance: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "enhanced_images",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>("enhanced_images");
        let count = 0;
        for (const record of data) {
          try {
            await prisma.enhancedImage.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  Image ${record.id}: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "albums",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>("albums");
        let count = 0;
        for (const record of data) {
          try {
            await prisma.album.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  Album ${record.id}: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "album_images",
      restore: async () => {
        const data = loadBackupFile<{ albumId: string; imageId: string; [key: string]: unknown; }>(
          "album_images",
        );
        let count = 0;
        for (const record of data) {
          try {
            await prisma.albumImage.upsert({
              where: { albumId_imageId: { albumId: record.albumId, imageId: record.imageId } },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  AlbumImage: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "image_enhancement_jobs",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>(
          "image_enhancement_jobs",
        );
        let count = 0;
        for (const record of data) {
          try {
            await prisma.imageEnhancementJob.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  Job ${record.id}: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
    {
      name: "vouchers",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>("vouchers");
        let count = 0;
        for (const record of data) {
          try {
            await prisma.voucher.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(`   ⚠️  Voucher: ${e instanceof Error ? e.message.substring(0, 50) : e}`);
          }
        }
        return count;
      },
    },
    {
      name: "api_keys",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>("api_keys");
        let count = 0;
        for (const record of data) {
          try {
            await prisma.apiKey.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(`   ⚠️  ApiKey: ${e instanceof Error ? e.message.substring(0, 50) : e}`);
          }
        }
        return count;
      },
    },
    {
      name: "featured_gallery_items",
      restore: async () => {
        const data = loadBackupFile<{ id: string; [key: string]: unknown; }>(
          "featured_gallery_items",
        );
        let count = 0;
        for (const record of data) {
          try {
            await prisma.featuredGalleryItem.upsert({
              where: { id: record.id },
              update: record as any,
              create: record as any,
            });
            count++;
          } catch (e) {
            console.log(
              `   ⚠️  GalleryItem: ${e instanceof Error ? e.message.substring(0, 50) : e}`,
            );
          }
        }
        return count;
      },
    },
  ];

  let totalRestored = 0;
  for (const table of restoreOrder) {
    console.log(`📥 Restoring ${table.name}...`);
    const count = await table.restore();
    console.log(`   ✅ ${count} records restored`);
    totalRestored += count;
  }

  console.log(`\n📊 Restore complete!`);
  console.log(`   Total records restored: ${totalRestored}\n`);
}

restore()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Restore failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
