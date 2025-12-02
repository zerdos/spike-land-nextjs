import NextAuth, { DefaultSession } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import crypto from "crypto"

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
 * Uses SHA256 hash of AUTH_SECRET salt + lowercase email to create a deterministic ID.
 * The salt prevents user ID prediction from known emails.
 *
 * WARNING: Do not rotate AUTH_SECRET as it would change all user IDs.
 */
function createStableUserId(email: string): string {
  const salt = process.env.AUTH_SECRET || ""
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
