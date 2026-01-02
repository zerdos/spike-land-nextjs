import { auth } from "@/auth";
import { assignReferralCodeToUser } from "@/lib/referral/code-generator";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/referral/link
 * Get or generate referral link for authenticated user
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to get referral link:", authError);
    return NextResponse.json(
      { error: "Failed to generate referral link" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or generate referral code
  const { data: referralCode, error: codeError } = await tryCatch(
    assignReferralCodeToUser(session.user.id),
  );

  if (codeError) {
    console.error("Failed to get referral link:", codeError);
    return NextResponse.json(
      { error: "Failed to generate referral link" },
      { status: 500 },
    );
  }

  // Build referral URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const referralUrl = `${baseUrl}?ref=${referralCode}`;

  return NextResponse.json({
    code: referralCode,
    url: referralUrl,
  });
}
