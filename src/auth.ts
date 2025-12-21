/**
 * NextAuth Configuration (Full - for route handlers)
 *
 * This file contains the full NextAuth configuration including database operations.
 * It extends the Edge-compatible config from auth.config.ts.
 * This file is used by route handlers (NOT middleware) for authentication.
 *
 * The signIn callback creates/updates users with stable IDs in the database.
 */

import { ensureUserAlbums } from "@/lib/albums/ensure-user-albums";
import { bootstrapAdminIfNeeded } from "@/lib/auth/bootstrap-admin";
import { logger } from "@/lib/errors/structured-logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { validateReferralAfterVerification } from "@/lib/referral/fraud-detection";
import { completeReferralAndGrantRewards } from "@/lib/referral/rewards";
import { linkReferralOnSignup } from "@/lib/referral/tracker";
import { attributeConversion } from "@/lib/tracking/attribution";
import { tryCatch } from "@/lib/try-catch";
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

    // Check if user already exists
    const { data: existingUser, error: findError } = await tryCatch(
      prisma.user.findUnique({
        where: { email: user.email },
      }),
    );

    if (findError) {
      // Log the error but don't block sign-in
      // The JWT callback will still set the correct stable ID, so the user
      // can authenticate. The database record will be created on next sign-in.
      console.error("Failed to upsert user with stable ID:", findError);
      return true;
    }

    const isNewUser = !existingUser;

    // Use upsert to handle both new and existing users
    const { data: upsertedUser, error: upsertError } = await tryCatch(
      prisma.user.upsert({
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
      }),
    );

    if (upsertError) {
      // Log the error but don't block sign-in
      // The JWT callback will still set the correct stable ID, so the user
      // can authenticate. The database record will be created on next sign-in.
      console.error("Failed to upsert user with stable ID:", upsertError);
      // Return true to allow sign-in to proceed since:
      // 1. JWT callback sets the correct stable ID regardless
      // 2. User can still authenticate even if DB is temporarily down
      // 3. The record will be created on next successful sign-in
      return true;
    }

    // Handle referral tracking for new users
    if (isNewUser) {
      // Bootstrap admin role for first user
      const { error: bootstrapError } = await tryCatch(
        bootstrapAdminIfNeeded(upsertedUser.id),
      );
      if (bootstrapError) {
        console.error("Failed to bootstrap admin:", bootstrapError);
      }

      // Assign referral code to new user
      const { error: referralCodeError } = await tryCatch(
        assignReferralCodeToUser(upsertedUser.id),
      );
      if (referralCodeError) {
        console.error("Failed to assign referral code:", referralCodeError);
      }

      // Link referral if cookie exists
      const { error: linkReferralError } = await tryCatch(
        linkReferralOnSignup(upsertedUser.id),
      );
      if (linkReferralError) {
        console.error("Failed to link referral on signup:", linkReferralError);
      }

      // Create default private and public albums
      const { error: albumsError } = await tryCatch(
        ensureUserAlbums(upsertedUser.id),
      );
      if (albumsError) {
        console.error("Failed to create default albums:", albumsError);
      }

      // Track signup conversion attribution for campaign analytics
      const { error: attributionError } = await tryCatch(
        attributeConversion(upsertedUser.id, "SIGNUP"),
      );
      if (attributionError) {
        console.error("Failed to track signup attribution:", attributionError);
      }
    }

    // Process referral rewards if email is verified (for OAuth, it's auto-verified)
    if (user.email && isNewUser) {
      const { data: validation, error: validationError } = await tryCatch(
        validateReferralAfterVerification(upsertedUser.id),
      );

      if (validationError) {
        console.error("Failed to validate referral:", validationError);
      } else if (validation?.shouldGrantRewards && validation.referralId) {
        const { error: rewardsError } = await tryCatch(
          completeReferralAndGrantRewards(validation.referralId),
        );
        if (rewardsError) {
          console.error("Failed to grant referral rewards:", rewardsError);
        }
      }
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

        // Find user by email
        const { data: user, error: findUserError } = await tryCatch(
          prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
            },
          }),
        );

        if (findUserError) {
          console.error("Credentials auth error:", findUserError);
          return null;
        }

        // Pre-computed dummy hash for timing attack prevention
        // This ensures bcrypt.compare always runs regardless of user existence
        const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeN9qo8uLOickgx2ZMRZoMy";

        // Always run bcrypt comparison to prevent timing attacks
        const hashToCompare = user?.passwordHash || dummyHash;
        const { data: isValidPassword, error: bcryptError } = await tryCatch(
          bcrypt.compare(password, hashToCompare),
        );

        if (bcryptError) {
          console.error("Credentials auth error:", bcryptError);
          return null;
        }

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
      },
    }),
  ],
  // Debug mode disabled - enable manually with AUTH_DEBUG=true if needed
  debug: process.env.AUTH_DEBUG === "true",
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
        const userId = token.sub;
        if (userId) {
          const { data: dbUser, error: roleError } = await tryCatch(
            prisma.user.findUnique({
              where: { id: userId },
              select: { role: true },
            }),
          );
          if (roleError) {
            console.error("Failed to fetch user role for JWT:", roleError);
            // Default to USER role if database lookup fails
            if (!token.role) {
              token.role = UserRole.USER;
            }
          } else if (dbUser) {
            token.role = dbUser.role;
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
    const { data: cookieStore } = await tryCatch(cookies());
    // Ignore if cookies cannot be read
    if (cookieStore) {
      const sessionToken = cookieStore.get("authjs.session-token")?.value;
      if (sessionToken === "mock-session-token") {
        const role = (cookieStore.get("e2e-user-role")?.value || "USER") as UserRole;
        const email = cookieStore.get("e2e-user-email")?.value || "test@example.com";
        const name = cookieStore.get("e2e-user-name")?.value || "Test User";

        // Map known test emails to seeded IDs
        let id = "test-user-id";
        if (email === "admin@example.com") {
          id = "admin-user-id";
        }

        return {
          user: {
            id,
            name,
            email,
            image: null,
            role,
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    }
  }
  // @ts-expect-error - auth accepts variable arguments
  return originalAuth(...args);
};
export { handlers, signIn, signOut };

// Export for use in data migration
export { createStableUserId };
