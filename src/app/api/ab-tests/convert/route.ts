import prisma from "@/lib/prisma";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { data: body, error: bodyError } = await tryCatch(request.json());

  if (bodyError) {
    console.error("Error converting variant:", bodyError);
    return NextResponse.json(
      { error: "Failed to convert variant" },
      { status: 500 }
    );
  }

  const { abTestResultId } = body;

  if (!abTestResultId) {
    return NextResponse.json(
      { error: "abTestResultId is required" },
      { status: 400 }
    );
  }

  const { data: updatedResult, error: updateError } = await tryCatch(
    prisma.abTestResult.update({
      where: { id: abTestResultId },
      data: { converted: true },
    })
  );

  if (updateError) {
    console.error(
      `Error updating A/B test result ${abTestResultId}:`,
      updateError
    );
    return NextResponse.json(
      { error: "Failed to update A/B test result" },
      { status: 500 }
    );
  }

  return NextResponse.json({ updatedResult });
}
