import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Error assigning variant:", bodyError);
    return NextResponse.json(
      { error: "Failed to assign variant" },
      { status: 500 },
    );
  }

  const { visitorId } = body;

  if (!visitorId) {
    return NextResponse.json(
      { error: "visitorId is required" },
      { status: 400 },
    );
  }

  const { data: activeTests, error: testsError } = await tryCatch(
    prisma.abTest.findMany({
      where: { status: "RUNNING" },
      include: { variants: true },
    }),
  );

  if (testsError) {
    console.error("Error fetching active A/B tests:", testsError);
    return NextResponse.json(
      { error: "Failed to fetch active A/B tests" },
      { status: 500 },
    );
  }

  const assignments = [];

  for (const test of activeTests) {
    const randomNumber = Math.random() * 100;
    let cumulativePercentage = 0;
    let assignedVariant = null;

    for (const variant of test.variants) {
      cumulativePercentage += variant.splitPercentage;
      if (randomNumber < cumulativePercentage) {
        assignedVariant = variant;
        break;
      }
    }

    if (assignedVariant) {
      const { data: assignment, error: createError } = await tryCatch(
        prisma.abTestResult.create({
          data: {
            visitorSessionId: visitorId,
            abTestVariantId: assignedVariant.id,
          },
        }),
      );

      if (createError) {
        console.error("Error creating A/B test result:", createError);
        // Continue to other tests even if one fails
      } else {
        assignments.push(assignment);
      }
    }
  }

  return NextResponse.json({ assignments });
}
