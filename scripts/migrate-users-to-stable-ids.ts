/**
 * Data Migration Script: Migrate users to stable email-based IDs
 *
 * This script:
 * 1. Finds all users with emails
 * 2. Calculates their new stable ID based on email
 * 3. Merges data from old IDs to new stable IDs
 * 4. Updates all related records (images, tokens, jobs, albums)
 *
 * Run with: npx ts-node --esm scripts/migrate-users-to-stable-ids.ts
 */

import { PrismaClient } from "@prisma/client"
import crypto from "crypto"

const prisma = new PrismaClient()

function createStableUserId(email: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex")
    .substring(0, 32)
  return `user_${hash}`
}

interface MigrationStats {
  usersProcessed: number
  usersMigrated: number
  imagesMigrated: number
  jobsMigrated: number
  tokenBalancesMigrated: number
  tokenTransactionsMigrated: number
  albumsMigrated: number
  errors: string[]
}

async function migrateUsers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    usersProcessed: 0,
    usersMigrated: 0,
    imagesMigrated: 0,
    jobsMigrated: 0,
    tokenBalancesMigrated: 0,
    tokenTransactionsMigrated: 0,
    albumsMigrated: 0,
    errors: [],
  }

  console.log("Starting user migration to stable email-based IDs...")

  // Get all users with emails
  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
    },
    include: {
      enhancedImages: true,
      enhancementJobs: true,
      tokenBalance: true,
      tokenTransactions: true,
      albums: true,
    },
  })

  console.log(`Found ${users.length} users with emails`)

  for (const user of users) {
    stats.usersProcessed++

    if (!user.email) {
      console.log(`Skipping user ${user.id} - no email`)
      continue
    }

    const stableId = createStableUserId(user.email)

    // Skip if already using stable ID
    if (user.id === stableId) {
      console.log(`User ${user.email} already has stable ID`)
      continue
    }

    console.log(`Migrating user ${user.email}: ${user.id} -> ${stableId}`)

    try {
      await prisma.$transaction(async (tx) => {
        // Check if stable ID user already exists
        const existingStableUser = await tx.user.findUnique({
          where: { id: stableId },
        })

        if (existingStableUser) {
          // Merge data into existing stable user
          console.log(`  Merging into existing stable user ${stableId}`)

          // Update enhanced images to use stable ID
          const imageResult = await tx.enhancedImage.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.imagesMigrated += imageResult.count

          // Update enhancement jobs to use stable ID
          const jobResult = await tx.imageEnhancementJob.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.jobsMigrated += jobResult.count

          // Merge token balances (add to existing)
          if (user.tokenBalance) {
            const existingBalance = await tx.userTokenBalance.findUnique({
              where: { userId: stableId },
            })
            if (existingBalance) {
              await tx.userTokenBalance.update({
                where: { userId: stableId },
                data: {
                  balance: existingBalance.balance + user.tokenBalance.balance,
                },
              })
              await tx.userTokenBalance.delete({
                where: { userId: user.id },
              })
            } else {
              await tx.userTokenBalance.update({
                where: { userId: user.id },
                data: { userId: stableId },
              })
            }
            stats.tokenBalancesMigrated++
          }

          // Update token transactions to use stable ID
          const txResult = await tx.tokenTransaction.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.tokenTransactionsMigrated += txResult.count

          // Update albums to use stable ID
          const albumResult = await tx.album.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.albumsMigrated += albumResult.count

          // Delete the old user
          await tx.user.delete({
            where: { id: user.id },
          })
        } else {
          // Create new user with stable ID and migrate all data
          await tx.user.create({
            data: {
              id: stableId,
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
              image: user.image,
              stripeCustomerId: user.stripeCustomerId,
            },
          })

          // Update all related records to use new stable ID
          const imageResult = await tx.enhancedImage.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.imagesMigrated += imageResult.count

          const jobResult = await tx.imageEnhancementJob.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.jobsMigrated += jobResult.count

          if (user.tokenBalance) {
            await tx.userTokenBalance.update({
              where: { userId: user.id },
              data: { userId: stableId },
            })
            stats.tokenBalancesMigrated++
          }

          const txResult = await tx.tokenTransaction.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.tokenTransactionsMigrated += txResult.count

          const albumResult = await tx.album.updateMany({
            where: { userId: user.id },
            data: { userId: stableId },
          })
          stats.albumsMigrated += albumResult.count

          // Delete the old user
          await tx.user.delete({
            where: { id: user.id },
          })
        }

        stats.usersMigrated++
      })

      console.log(`  Successfully migrated user ${user.email}`)
    } catch (error) {
      const errorMsg = `Failed to migrate user ${user.email}: ${error}`
      console.error(`  ${errorMsg}`)
      stats.errors.push(errorMsg)
    }
  }

  return stats
}

async function main() {
  console.log("=".repeat(60))
  console.log("User Migration to Stable Email-Based IDs")
  console.log("=".repeat(60))

  const stats = await migrateUsers()

  console.log("\n" + "=".repeat(60))
  console.log("Migration Complete")
  console.log("=".repeat(60))
  console.log(`Users processed: ${stats.usersProcessed}`)
  console.log(`Users migrated: ${stats.usersMigrated}`)
  console.log(`Images migrated: ${stats.imagesMigrated}`)
  console.log(`Jobs migrated: ${stats.jobsMigrated}`)
  console.log(`Token balances migrated: ${stats.tokenBalancesMigrated}`)
  console.log(`Token transactions migrated: ${stats.tokenTransactionsMigrated}`)
  console.log(`Albums migrated: ${stats.albumsMigrated}`)

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`)
    stats.errors.forEach((err) => console.log(`  - ${err}`))
  }
}

main()
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
