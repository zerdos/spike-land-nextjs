import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttributionService } from './attribution-service';
import { AttributionModel } from '@spike-npm-land/shared/types';

// Mock types locally if import fails, or assume import works. 
// Ideally we import from the service but if types are broken we might need internal mocks.
// But we are testing logic.

const mockPrisma = {
  boostAttributionEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
} as any;

describe('AttributionService', () => {
  let service: AttributionService;

  beforeEach(() => {
    service = new AttributionService(mockPrisma);
    vi.clearAllMocks();
  });

  it('should calculate attribution with non-negative overlap', async () => {
    // Mock events
    // 2 organic, 8 paid. Total 10.
    // Organic share: 0.2, Paid share: 0.8.
    // Conversions: 5.
    // Attributed Organic: 5 * 0.2 = 1.
    // Attributed Paid: 5 * 0.8 = 4.
    // Overlap: 5 - 1 - 4 = 0.
    
    // Test case where rounding might cause negative overlap
    // Imagine 3 events: 1 organic, 2 paid.
    // Organic: 1/3 = 0.333
    // Paid: 2/3 = 0.666
    // Conversions: 10.
    // Organic attr: 10 * 0.333 = 3.33 -> 3
    // Paid attr: 10 * 0.666 = 6.66 -> 7
    // Overlap: 10 - 3 - 7 = 0.
    
    // Case leading to negative:
    // 2 events: 1 organic, 1 paid.
    // Org: 0.5, Paid: 0.5.
    // Conversions: 1.
    // Org attr: 1 * 0.5 = 0.5 -> round -> 1
    // Paid attr: 1 * 0.5 = 0.5 -> round -> 1!
    // Overlap: 1 - 1 - 1 = -1.
    // Should be clamped to 0.

    const events = [
      { id: '1', touchpointType: 'ORGANIC', eventType: 'VIEW', occurredAt: new Date() },
      { id: '2', touchpointType: 'PAID', eventType: 'CLICK', occurredAt: new Date() },
      { id: '3', touchpointType: 'ORGANIC', eventType: 'CONVERSION', occurredAt: new Date() }, // Conversion 1
    ];
    // filter(CONVERSION) -> 1 event.
    
    // But events passed to calculateLinearAttribution are ALL events.
    // However, the service fetches events from DB.

    mockPrisma.boostAttributionEvent.findMany.mockResolvedValue(events);

    const result = await service.calculateAttribution('boost-1', AttributionModel.LINEAR);
    
    expect(result.details.conversions).toBe(1);
    expect(result.details.attributedOverlap).toBe(0); // Should be 0, not -1
  });
});
