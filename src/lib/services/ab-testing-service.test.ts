// src/lib/services/ab-testing-service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbTestingService } from './ab-testing-service';
import prisma from '@/lib/prisma';
import * as abTesting from '@/lib/ab-testing';
import { logger } from '@/lib/logger';

vi.mock('@/lib/prisma', () => ({
  default: {
    abTest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ab-testing', async () => {
    const original = await vi.importActual('@/lib/ab-testing');
    return {
        ...original,
        determineWinner: vi.fn(),
    };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AbTestingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTestId = 'test-id-123';
  const mockAbTest = {
    id: mockTestId,
    significanceLevel: 0.05,
    status: 'RUNNING',
    variants: [
      {
        id: 'control-id',
        name: 'Control',
        results: [{ converted: true }, { converted: false }],
      },
      {
        id: 'variant-id',
        name: 'Variant A',
        results: [{ converted: true }, { converted: true }, { converted: false }],
      },
    ],
  };

  it('should calculate and store results for a valid A/B test', async () => {
    (prisma.abTest.findUnique as vi.Mock).mockResolvedValue(mockAbTest);
    const mockWinnerResult = {
      winner: 'Variant A',
      pValue: 0.04,
      confidenceInterval: [0.1, 0.5],
    };
    (abTesting.determineWinner as vi.Mock).mockReturnValue(mockWinnerResult);
    (prisma.abTest.update as vi.Mock).mockResolvedValue({
      ...mockAbTest,
      status: 'COMPLETED',
      winnerVariantId: 'variant-id',
      results: {
        pValue: 0.04,
        confidenceInterval: [0.1, 0.5],
        winnerName: 'Variant A',
      },
    });

    const result = await AbTestingService.calculateAndStoreResults(mockTestId);

    expect(prisma.abTest.findUnique).toHaveBeenCalledWith({
      where: { id: mockTestId },
      include: {
        variants: {
          include: {
            results: true,
          },
        },
      },
    });

    expect(abTesting.determineWinner).toHaveBeenCalledWith(
      { name: 'Control', visitors: 2, conversions: 1 },
      { name: 'Variant A', visitors: 3, conversions: 2 },
      0.05,
    );

    expect(prisma.abTest.update).toHaveBeenCalledWith({
      where: { id: mockTestId },
      data: {
        results: {
          pValue: mockWinnerResult.pValue,
          confidenceInterval: mockWinnerResult.confidenceInterval,
          winnerName: mockWinnerResult.winner,
        },
        winnerVariantId: 'variant-id',
        status: 'COMPLETED',
      },
    });

    expect(result).toBeDefined();
    expect(result?.status).toBe('COMPLETED');
    expect(logger.info).toHaveBeenCalledWith(
      `Calculating results for A/B test: ${mockTestId}`,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Successfully calculated and stored results for A/B test: ${mockTestId}`,
    );
  });

  it('should return null if the A/B test is not found', async () => {
    (prisma.abTest.findUnique as vi.Mock).mockResolvedValue(null);

    const result = await AbTestingService.calculateAndStoreResults(mockTestId);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      `A/B test with ID ${mockTestId} not found.`,
    );
    expect(prisma.abTest.update).not.toHaveBeenCalled();
  });

  it('should return the test without changes if there are fewer than 2 variants', async () => {
    const singleVariantTest = { ...mockAbTest, variants: [mockAbTest.variants[0]] };
    (prisma.abTest.findUnique as vi.Mock).mockResolvedValue(singleVariantTest);

    const result = await AbTestingService.calculateAndStoreResults(mockTestId);

    expect(result).toEqual(singleVariantTest);
    expect(logger.warn).toHaveBeenCalledWith(
      `A/B test ${mockTestId} has fewer than 2 variants. Cannot calculate winner.`,
    );
    expect(abTesting.determineWinner).not.toHaveBeenCalled();
    expect(prisma.abTest.update).not.toHaveBeenCalled();
  });
});
