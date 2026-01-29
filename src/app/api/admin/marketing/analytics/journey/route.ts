import { auth } from "@/auth";
import { getJourneyStats } from "@/lib/tracking/journey-analyzer";
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

    const stats = await getJourneyStats(startDate, endDate);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching journey stats:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
