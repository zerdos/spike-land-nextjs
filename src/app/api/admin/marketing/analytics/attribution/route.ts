import { auth } from "@/auth";
import { getGlobalAttributionSummary } from "@/lib/tracking/attribution";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return new NextResponse("Missing date parameters", { status: 400 });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new NextResponse("Invalid date parameters", { status: 400 });
    }

    const summary = await getGlobalAttributionSummary(startDate, endDate);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching attribution summary:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
