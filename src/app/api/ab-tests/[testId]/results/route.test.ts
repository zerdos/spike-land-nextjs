// src/app/api/ab-tests/[testId]/results/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { AbTestingService } from '@/lib/services/ab-testing-service';
import { NextResponse } from 'next/server';

vi.mock('@/lib/services/ab-testing-service', () => ({
  AbTestingService: {
    calculateAndStoreResults: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('POST /api/ab-tests/[testId]/results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTestId = 'test-id-456';
  const mockContext = {
    params: {
      testId: mockTestId,
    },
  };
  const mockRequest = {} as Request;

  it('should return the updated A/B test on success', async () => {
    const mockUpdatedTest = { id: mockTestId, status: 'COMPLETED' };
    (AbTestingService.calculateAndStoreResults as vi.Mock).mockResolvedValue(
      mockUpdatedTest,
    );

    const response = await POST(mockRequest, mockContext);

    expect(AbTestingService.calculateAndStoreResults).toHaveBeenCalledWith(
      mockTestId,
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(mockUpdatedTest);
  });

  it('should return a 404 error if the test is not found', async () => {
    (AbTestingService.calculateAndStoreResults as vi.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest, mockContext);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json).toEqual({ error: `A/B test with ID ${mockTestId} not found.` });
  });

  it('should return a 500 error on internal server error', async () => {
    const mockError = new Error('Something went wrong');
    (AbTestingService.calculateAndStoreResults as vi.Mock).mockRejectedValue(
      mockError,
    );

    const response = await POST(mockRequest, mockContext);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toEqual({ error: 'Internal Server Error' });
  });
});
