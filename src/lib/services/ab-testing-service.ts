// src/lib/services/ab-testing-service.ts

import prisma from '@/lib/prisma';
import { determineWinner, Variant as CalculationVariant } from '@/lib/ab-testing';
import { logger } from '@/lib/logger';

export class AbTestingService {
  /**
   * Calculates the results of an A/B test and stores them in the database.
   * @param testId The ID of the A/B test to analyze.
   * @returns The updated A/B test with results, or null if not found.
   */
  public static async calculateAndStoreResults(testId: string) {
    logger.info(`Calculating results for A/B test: ${testId}`);

    const abTest = await prisma.abTest.findUnique({
      where: { id: testId },
      include: {
        variants: {
          include: {
            results: true,
          },
        },
      },
    });

    if (!abTest) {
      logger.error(`A/B test with ID ${testId} not found.`);
      return null;
    }

    if (abTest.variants.length < 2) {
      logger.warn(
        `A/B test ${testId} has fewer than 2 variants. Cannot calculate winner.`,
      );
      return abTest;
    }

    const [control, variantToCompare] = abTest.variants;

    if (!variantToCompare) {
      logger.warn(
        `A/B test ${testId} only has one variant. No comparison to make.`,
      );
      return abTest;
    }

    const controlData: CalculationVariant = {
      name: control.name,
      visitors: control.results.length,
      conversions: control.results.filter((r) => r.converted).length,
    };

    const variantData: CalculationVariant = {
      name: variantToCompare.name,
      visitors: variantToCompare.results.length,
      conversions: variantToCompare.results.filter((r) => r.converted).length,
    };

    const results = determineWinner(
      controlData,
      variantData,
      abTest.significanceLevel,
    );

    let winnerVariantId: string | null = null;
    if (results.winner) {
      const winner = abTest.variants.find((v) => v.name === results.winner);
      winnerVariantId = winner ? winner.id : null;
    }

    const updatedTest = await prisma.abTest.update({
      where: { id: testId },
      data: {
        results: {
          pValue: results.pValue,
          confidenceInterval: results.confidenceInterval,
          winnerName: results.winner,
        },
        winnerVariantId: winnerVariantId,
        status: 'COMPLETED',
      },
    });

    logger.info(
      `Successfully calculated and stored results for A/B test: ${testId}`,
    );
    return updatedTest;
  }
}
