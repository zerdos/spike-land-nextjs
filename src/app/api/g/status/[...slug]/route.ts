import { NextResponse } from "next/server";
import { getRouteBySlug } from "@/lib/generate/route-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");

  const route = await getRouteBySlug(slug);

  if (!route) {
    return NextResponse.json({ status: "NOT_FOUND" });
  }

  return NextResponse.json({
    status: route.status,
    title: route.title,
    description: route.description,
    codespaceUrl: route.codespaceUrl,
    generationTimeMs: route.generationTimeMs,
    viewCount: route.viewCount,
  });
}
