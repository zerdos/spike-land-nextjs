import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";
import { scoreVariant } from "@/lib/creative-factory/scorers/variant-scorer";
import { z } from "zod";

const scoreSchema = z.object({
  headline: z.string(),
  bodyText: z.string(),
  callToAction: z.string().optional(),
  targetAudience: z.string().optional(),
  platform: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const json = await req.json();
    const body = scoreSchema.parse(json);

    const score = await scoreVariant(body);

    return NextResponse.json(score);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("Variant scoring error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
