import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getUserByReferralCode } from "./code-generator";

const REFERRAL_COOKIE_NAME = "ref_code";
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Store referral code in cookie when user visits with ?ref= parameter
 */
export async function trackReferralCode(code: string): Promise<boolean> {
  // Validate code exists in database
  const referrerId = await getUserByReferralCode(code);
  if (!referrerId) {
    return false;
  }

  // Store in cookie
  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE_NAME, code, {
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return true;
}

/**
 * Get referral code from cookie
 */
export async function getReferralCodeFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const referralCookie = cookieStore.get(REFERRAL_COOKIE_NAME);
  return referralCookie?.value ?? null;
}

/**
 * Clear referral cookie after successful signup
 */
export async function clearReferralCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFERRAL_COOKIE_NAME);
}

/**
 * Link new user to referrer based on cookie
 * Creates referral record in PENDING status
 */
export async function linkReferralOnSignup(
  newUserId: string,
  ipAddress?: string,
): Promise<{ success: boolean; referrerId?: string; error?: string; }> {
  try {
    // Get referral code from cookie
    const referralCode = await getReferralCodeFromCookie();
    if (!referralCode) {
      return { success: false, error: "No referral code found" };
    }

    // Get referrer ID
    const referrerId = await getUserByReferralCode(referralCode);
    if (!referrerId) {
      return { success: false, error: "Invalid referral code" };
    }

    // Prevent self-referral
    if (referrerId === newUserId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    // Update new user with referrer
    await prisma.user.update({
      where: { id: newUserId },
      data: { referredById: referrerId },
    });

    // Create referral record
    await prisma.referral.create({
      data: {
        referrerId,
        refereeId: newUserId,
        ipAddress: ipAddress ?? null,
        status: "PENDING", // Will be completed after fraud checks
      },
    });

    // Clear cookie after successful linkage
    await clearReferralCookie();

    return { success: true, referrerId };
  } catch (error) {
    console.error("Failed to link referral on signup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get referrer ID for a user
 */
export async function getReferrerId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });

  return user?.referredById ?? null;
}
