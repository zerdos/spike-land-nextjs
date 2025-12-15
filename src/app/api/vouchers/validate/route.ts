import { auth } from "@/auth";
import { VoucherManager } from "@/lib/vouchers/voucher-manager";
import { NextRequest, NextResponse } from "next/server";

// Voucher code validation: alphanumeric, max 50 chars
const VOUCHER_CODE_REGEX = /^[A-Z0-9]+$/i;
const MAX_VOUCHER_CODE_LENGTH = 50;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    // Input validation: required, string type, max length, alphanumeric format
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Voucher code is required" },
        { status: 400 },
      );
    }

    const trimmedCode = code.trim();
    if (
      trimmedCode.length === 0 || trimmedCode.length > MAX_VOUCHER_CODE_LENGTH
    ) {
      return NextResponse.json(
        { error: "Invalid voucher code format" },
        { status: 400 },
      );
    }

    if (!VOUCHER_CODE_REGEX.test(trimmedCode)) {
      return NextResponse.json(
        { error: "Invalid voucher code format" },
        { status: 400 },
      );
    }

    // Get user session if available (optional for validation)
    const session = await auth();
    const userId = session?.user?.id;

    const result = await VoucherManager.validate(trimmedCode, userId);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      voucher: result.voucher,
    });
  } catch (error) {
    console.error("Voucher validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate voucher" },
      { status: 500 },
    );
  }
}
