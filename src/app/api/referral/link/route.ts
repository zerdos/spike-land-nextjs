import { auth } from "@/auth";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/referral/link
 * Get or generate referral link for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or generate referral code
    const referralCode = await assignReferralCodeToUser(session.user.id);

    // Build referral URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const referralUrl = `${baseUrl}?ref=${referralCode}`;

    return NextResponse.json({
      code: referralCode,
      url: referralUrl,
    });
  } catch (error) {
    console.error("Failed to get referral link:", error);
    return NextResponse.json(
      { error: "Failed to generate referral link" },
      { status: 500 },
    );
  }
}
