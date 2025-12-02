/**
 * NextAuth Configuration (Edge-compatible)
 *
 * This file contains the Edge-compatible NextAuth configuration.
 * It does NOT import prisma or any Node.js-only modules.
 * Used by middleware for authentication checks.
 *
 * Database operations are handled in auth.ts (route handlers only).
 */

import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import crypto from "crypto"

/**
 * Creates a stable user ID based on email address.
 * This ensures the same user gets the same ID regardless of OAuth provider.
 * Uses HMAC-SHA256 with salt as key and email as message for security.
 * HMAC prevents length extension attacks and collision vulnerabilities.
 *
 * Uses USER_ID_SALT (preferred) or falls back to AUTH_SECRET.
 * USER_ID_SALT should never be rotated as it would change all user IDs.
 * Using a dedicated salt allows AUTH_SECRET to be rotated for security.
 *
 * IMPORTANT: User IDs are tied to email addresses. If a user changes their
 * email address (at the OAuth provider level), they will get a new user ID
 * and lose access to their previous data. This is by design to maintain
 * the 1:1 relationship between email and user identity.
 */
export function createStableUserId(email: string): string {
  const salt = process.env.USER_ID_SALT || process.env.AUTH_SECRET
  if (!salt) {
    throw new Error(
      "USER_ID_SALT or AUTH_SECRET environment variable must be set for stable user IDs"
    )
  }
  // Use HMAC for better security (prevents collision attacks)
  const hash = crypto
    .createHmac("sha256", salt)
    .update(email.toLowerCase().trim())
    .digest("hex")
    .substring(0, 32)
  return `user_${hash}`
}

/**
 * NextAuth configuration for Edge runtime (middleware).
 * Does not include database operations.
 */
export const authConfig: NextAuthConfig = {
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
}
