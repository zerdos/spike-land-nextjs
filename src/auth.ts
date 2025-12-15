/**
 * NextAuth Configuration (Full - for route handlers)
 *
 * This file contains the full NextAuth configuration including database operations.
 * It extends the Edge-compatible config from auth.config.ts.
 * This file is used by route handlers (NOT middleware) for authentication.
 *
 * The signIn callback creates/updates users with stable IDs in the database.
 */

import { bootstrapAdminIfNeeded } from "@/lib/auth/bootstrap-admin";
import { logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { validateReferralAfterVerification } from "@/lib/referral/fraud-detection";
import { completeReferralAndGrantRewards } from "@/lib/referral/rewards";
import { linkReferralOnSignup } from "@/lib/referral/tracker";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth, { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { authConfig, createStableUserId } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
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
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<boolean> {
  // Create or update user with stable ID based on email
  // This runs before NextAuth creates a user with random CUID
  if (user.email) {
    const stableId = createStableUserId(user.email);
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      const isNewUser = !existingUser;

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
      });

      // Handle referral tracking for new users
      if (isNewUser) {
        // Bootstrap admin role for first user
        await bootstrapAdminIfNeeded(upsertedUser.id).catch((error) => {
          console.error("Failed to bootstrap admin:", error);
        });

        // Assign referral code to new user
        await assignReferralCodeToUser(upsertedUser.id).catch((error) => {
          console.error("Failed to assign referral code:", error);
        });

        // Link referral if cookie exists
        await linkReferralOnSignup(upsertedUser.id).catch((error) => {
          console.error("Failed to link referral on signup:", error);
        });

        // Create default public album
        await prisma.album.create({
          data: {
            userId: upsertedUser.id,
            name: "Public Gallery",
            privacy: "PUBLIC",
            defaultTier: "TIER_1K",
            description: "My public enhancements",
          },
        }).catch((error) => {
          console.error("Failed to create default album:", error);
        });
      }

      // Process referral rewards if email is verified (for OAuth, it's auto-verified)
      if (user.email && isNewUser) {
        const validation = await validateReferralAfterVerification(
          upsertedUser.id,
        ).catch((error) => {
          console.error("Failed to validate referral:", error);
          return null;
        });

        if (validation?.shouldGrantRewards && validation.referralId) {
          await completeReferralAndGrantRewards(validation.referralId).catch(
            (error) => {
              console.error("Failed to grant referral rewards:", error);
            },
          );
        }
      }
    } catch (error) {
      // Log the error but don't block sign-in
      // The JWT callback will still set the correct stable ID, so the user
      // can authenticate. The database record will be created on next sign-in.
      console.error("Failed to upsert user with stable ID:", error);
      // Return false only for critical errors that should block sign-in
      // For database errors, we allow sign-in to proceed since:
      // 1. JWT callback sets the correct stable ID regardless
      // 2. User can still authenticate even if DB is temporarily down
      // 3. The record will be created on next successful sign-in
    }
  }
  return true;
}

import { cookies } from "next/headers";

const { handlers, signIn, signOut, auth: originalAuth } = NextAuth({
  ...authConfig,
  // ... existing config ...

  // Add Credentials provider for email/password login (primarily for testing)
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email & Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "test@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Rate limit login attempts per email (5 attempts per 15 minutes)
        const rateLimitResult = await checkRateLimit(
          `login:${email.toLowerCase()}`,
          {
            maxRequests: 5,
            windowMs: 15 * 60 * 1000, // 15 minutes
          },
        );

        if (rateLimitResult.isLimited) {
          console.warn(`Rate limited login attempt for: ${email}`);
          return null;
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
            },
          });

          // Pre-computed dummy hash for timing attack prevention
          // This ensures bcrypt.compare always runs regardless of user existence
          const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeN9qo8uLOickgx2ZMRZoMy";

          // Always run bcrypt comparison to prevent timing attacks
          const hashToCompare = user?.passwordHash || dummyHash;
          const isValidPassword = await bcrypt.compare(password, hashToCompare);

          // Return null if user doesn't exist, has no password, or password is invalid
          if (!user || !user.passwordHash || !isValidPassword) {
            return null;
          }

          // Return user object (NextAuth will use this)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Credentials auth error:", error);
          return null;
        }
      },
    }),
  ],
  // Enable debug mode in development for detailed auth logs
  debug: process.env.NODE_ENV === "development",
  // Custom logger to capture auth errors in production
  // NextAuth v5 logger signature: (code, ...message) for all methods
  logger: {
    error(code, ...message) {
      logger.error(`NextAuth error: ${code}`, undefined, {
        route: "/api/auth",
        details: message,
      });
    },
    warn(code, ...message) {
      logger.warn(`NextAuth warning: ${code}`, {
        route: "/api/auth",
        details: message,
      });
    },
    debug(code, ...message) {
      if (process.env.NODE_ENV === "development") {
        logger.debug(`NextAuth debug: ${code}`, {
          route: "/api/auth",
          details: message,
        });
      }
    },
  },
  // Track auth events for monitoring and debugging
  events: {
    signIn: ({ user, account }) => {
      logger.info("User signed in", {
        userId: user.id,
        provider: account?.provider,
        route: "/api/auth",
      });
    },
    signOut: (message) => {
      // Handle both token and session based signOut
      // JWT strategy uses token, database strategy uses session
      const identifier = "token" in message ? message.token?.sub : undefined;
      logger.info("User signed out", {
        userId: identifier,
        route: "/api/auth",
      });
    },
    createUser: ({ user }) => {
      logger.info("New user created via auth", {
        userId: user.id,
        route: "/api/auth",
      });
    },
    linkAccount: ({ user, account }) => {
      logger.info("Account linked", {
        userId: user.id,
        provider: account.provider,
        route: "/api/auth",
      });
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Skip handleSignIn for credentials provider
      // For credentials signin, user already exists in DB (created via /api/auth/signup)
      // and all post-signup tasks (referral, album, etc.) were already completed
      if (account?.provider === "credentials") {
        return true;
      }
      // For OAuth providers (GitHub, Google), run normal handleSignIn flow
      return handleSignIn(user);
    },
    async jwt({ token, user, trigger }): Promise<JWT> {
      // Call base jwt callback for stable ID handling
      const baseCallbacks = authConfig.callbacks;
      if (baseCallbacks?.jwt) {
        const result = await baseCallbacks.jwt(
          { token, user, trigger } as Parameters<typeof baseCallbacks.jwt>[0],
        );
        if (result) {
          token = result;
        }
      }

      // On initial sign-in or refresh, fetch role from database
      if (user?.email || trigger === "signIn" || trigger === "update") {
        try {
          const userId = token.sub;
          if (userId) {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { role: true },
            });
            if (dbUser) {
              token.role = dbUser.role;
            }
          }
        } catch (error) {
          console.error("Failed to fetch user role for JWT:", error);
          // Default to USER role if database lookup fails
          if (!token.role) {
            token.role = UserRole.USER;
          }
        }
      }

      // Ensure role has a default value
      if (!token.role) {
        token.role = UserRole.USER;
      }

      return token;
    },
    session({ session, token }) {
      // Copy ID and role from token to session
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.role && session.user) {
        session.user.role = token.role;
      } else if (session.user) {
        session.user.role = UserRole.USER;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = async (...args: any[]) => {
  if (process.env.E2E_BYPASS_AUTH === "true") {
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("authjs.session-token")?.value;
      if (sessionToken === "mock-session-token") {
        return {
          user: {
            id: "test-user-id",
            name: "Test User",
            email: "test@example.com",
            image: null,
            role: "USER" as UserRole,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    } catch (_e) {
      // Ignore if cookies cannot be read
    }
  }
  // @ts-expect-error - auth accepts variable arguments
  return originalAuth(...args);
};

export { handlers, signIn, signOut };

// Export for use in data migration
export { createStableUserId };
