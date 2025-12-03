/**
 * NextAuth Configuration (Full - for route handlers)
 *
 * This file contains the full NextAuth configuration including database operations.
 * It extends the Edge-compatible config from auth.config.ts.
 * This file is used by route handlers (NOT middleware) for authentication.
 *
 * The signIn callback creates/updates users with stable IDs in the database.
 */

import NextAuth, { DefaultSession } from "next-auth"
import { authConfig, createStableUserId } from "./auth.config"
import prisma from "@/lib/prisma"
import { linkReferralOnSignup } from "@/lib/referral/tracker"
import { validateReferralAfterVerification } from "@/lib/referral/fraud-detection"
import { completeReferralAndGrantRewards } from "@/lib/referral/rewards"
import { assignReferralCodeToUser } from "@/lib/referral/code-generator"
import { bootstrapAdminIfNeeded } from "@/lib/auth/bootstrap-admin"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

/**
 * Handles user creation/update with stable ID during sign-in.
 * Also processes referral tracking and rewards.
 * Exported for testing purposes.
 *
 * @param user - The user object from OAuth provider
 * @returns true to allow sign-in to proceed
 */
export async function handleSignIn(user: {
  email?: string | null
  name?: string | null
  image?: string | null
}): Promise<boolean> {
  // Create or update user with stable ID based on email
  // This runs before NextAuth creates a user with random CUID
  if (user.email) {
    const stableId = createStableUserId(user.email)
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      })

      const isNewUser = !existingUser

      // Use upsert to handle both new and existing users
      const upsertedUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          // Update profile info if user already exists
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          id: stableId,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      })

      // Handle referral tracking for new users
      if (isNewUser) {
        // Bootstrap admin role for first user
        await bootstrapAdminIfNeeded(upsertedUser.id).catch((error) => {
          console.error("Failed to bootstrap admin:", error)
        })

        // Assign referral code to new user
        await assignReferralCodeToUser(upsertedUser.id).catch((error) => {
          console.error("Failed to assign referral code:", error)
        })

        // Link referral if cookie exists
        await linkReferralOnSignup(upsertedUser.id).catch((error) => {
          console.error("Failed to link referral on signup:", error)
        })
      }

      // Process referral rewards if email is verified (for OAuth, it's auto-verified)
      if (user.email && isNewUser) {
        const validation = await validateReferralAfterVerification(
          upsertedUser.id
        ).catch((error) => {
          console.error("Failed to validate referral:", error)
          return null
        })

        if (validation?.shouldGrantRewards && validation.referralId) {
          await completeReferralAndGrantRewards(validation.referralId).catch(
            (error) => {
              console.error("Failed to grant referral rewards:", error)
            }
          )
        }
      }
    } catch (error) {
      // Log the error but don't block sign-in
      // The JWT callback will still set the correct stable ID, so the user
      // can authenticate. The database record will be created on next sign-in.
      console.error("Failed to upsert user with stable ID:", error)
      // Return false only for critical errors that should block sign-in
      // For database errors, we allow sign-in to proceed since:
      // 1. JWT callback sets the correct stable ID regardless
      // 2. User can still authenticate even if DB is temporarily down
      // 3. The record will be created on next successful sign-in
    }
  }
  return true
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      return handleSignIn(user)
    },
  },
  secret: process.env.AUTH_SECRET,
})

// Export for use in data migration
export { createStableUserId }
