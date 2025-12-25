import prisma from "@/lib/prisma";

/**
 * System anonymous user configuration.
 * This user is used for anonymous image uploads and mix jobs.
 */
const ANONYMOUS_USER_ID = "anonymous-system-user";
const ANONYMOUS_USER_EMAIL = "anonymous@system.spike.land";
const ANONYMOUS_USER_NAME = "Anonymous User";

/**
 * Gets or creates the system anonymous user.
 * This user is used as the owner for images and jobs created by
 * non-logged-in users.
 *
 * @returns The anonymous user ID
 */
export async function getOrCreateAnonymousUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { id: ANONYMOUS_USER_ID },
    update: {},
    create: {
      id: ANONYMOUS_USER_ID,
      email: ANONYMOUS_USER_EMAIL,
      name: ANONYMOUS_USER_NAME,
    },
  });
  return user.id;
}

/**
 * The ID of the system anonymous user.
 * Use getOrCreateAnonymousUser() to ensure the user exists.
 */
export const ANONYMOUS_USER_ID_CONST = ANONYMOUS_USER_ID;

/**
 * Checks if a user ID belongs to the anonymous user.
 */
export function isAnonymousUserId(userId: string): boolean {
  return userId === ANONYMOUS_USER_ID;
}
