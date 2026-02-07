// src/app/api/ab-tests/[testId]/results/route.ts

import { NextResponse } from 'next/server';
import { AbTestingService } from '@/lib/services/ab-testing-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const routeContextSchema = z.object({
  params: z.object({
    testId: z.string(),
  }),
});

export async function POST(
  req: Request,
  context: z.infer<typeof routeContextSchema>,
) {
  try {
    const { params } = routeContextSchema.parse(context);
    const { testId } = params;

    const updatedTest =
      await AbTestingService.calculateAndStoreResults(testId);

    if (!updatedTest) {
      return NextResponse.json(
        { error: `A/B test with ID ${testId} not found.` },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedTest);
  } catch (error) {
    logger.error('Failed to calculate A/B test results:', { error });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
