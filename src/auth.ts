import NextAuth, { DefaultSession } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import crypto from "crypto"
import prisma from "@/lib/prisma"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

/**
 * Creates a stable user ID based on email address.
 * This ensures the same user gets the same ID regardless of OAuth provider.
 * Uses SHA256 hash of salt + lowercase email to create a deterministic ID.
 * The salt prevents user ID prediction from known emails.
 *
 * Uses USER_ID_SALT (preferred) or falls back to AUTH_SECRET.
 * USER_ID_SALT should never be rotated as it would change all user IDs.
 * Using a dedicated salt allows AUTH_SECRET to be rotated for security.
 */
function createStableUserId(email: string): string {
  const salt = process.env.USER_ID_SALT || process.env.AUTH_SECRET
  if (!salt) {
    throw new Error(
      "USER_ID_SALT or AUTH_SECRET environment variable must be set for stable user IDs"
    )
  }
  const hash = crypto
    .createHash("sha256")
    .update(salt + email.toLowerCase().trim())
    .digest("hex")
    .substring(0, 32)
  return `user_${hash}`
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Create or update user with stable ID based on email
      // This runs before NextAuth creates a user with random CUID
      if (user.email) {
        const stableId = createStableUserId(user.email)
        try {
          // Use upsert to handle both new and existing users
          await prisma.user.upsert({
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
        } catch (error) {
          console.error("Failed to upsert user with stable ID:", error)
          // Still allow sign in even if upsert fails
        }
      }
      return true
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    jwt({ token, user }) {
      if (user?.email) {
        // Use stable ID based on email (same across all OAuth providers)
        token.sub = createStableUserId(user.email)
      } else if (user?.id) {
        // Fallback for users without email - use provider ID with prefix
        token.sub = `provider_${user.id}`
      }
      // If neither email nor id exists, token.sub remains from previous JWT
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
})

// Export for use in data migration
export { createStableUserId }
