import { checkRateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/rate-limit";
import { tryCatch } from "@/lib/try-catch";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = getClientIp(request);

  const { isLimited } = await checkRateLimit(`bazdmeg:helpful:${ip}`, {
    maxRequests: 20,
    windowMs: 60000,
  });

  if (isLimited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const prisma = (await import("@/lib/prisma")).default;
  const { data: entry, error } = await tryCatch(
    prisma.bazdmegFaqEntry.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    }),
  );

  if (error) {
    return NextResponse.json({ error: "FAQ entry not found" }, { status: 404 });
  }

  return NextResponse.json({ helpfulCount: entry.helpfulCount });
}
