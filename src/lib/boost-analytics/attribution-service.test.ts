/**
 * Unit Tests for AttributionService
 * Tests for Issue #570 - Boost Analytics Foundation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttributionService } from './attribution-service';

// Define AttributionModel locally to avoid import resolution issues in vitest
const AttributionModel = {
  LINEAR: 'LINEAR',
  TIME_DECAY: 'TIME_DECAY',
  POSITION_BASED: 'POSITION_BASED',
  ML_BASED: 'ML_BASED',
} as const;

const mockPrisma = {
  boostAttributionEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
} as any;


describe('AttributionService', () => {
  let service: AttributionService;

  const mockAttributionEvent = {
    id: 'event-1',
    boostCampaignId: 'boost-1',
    sessionId: 'session-1',
    userId: 'user-1',
    eventType: 'CLICK',
    touchpointType: 'PAID',
    platform: 'FACEBOOK',
    eventValue: 1000,
    eventMetadata: { adId: 'ad-123' },
    occurredAt: new Date('2024-01-15T10:00:00Z'),
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(() => {
    service = new AttributionService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('trackAttributionEvent', () => {
    it('should track a new attribution event', async () => {
      mockPrisma.boostAttributionEvent.create.mockResolvedValue(mockAttributionEvent);

      const result = await service.trackAttributionEvent({
        boostCampaignId: 'boost-1',
        sessionId: 'session-1',
        userId: 'user-1',
        eventType: 'CLICK' as any,
        touchpointType: 'PAID' as any,
        platform: 'FACEBOOK',
        eventValue: 1000,
        eventMetadata: { adId: 'ad-123' },
        occurredAt: new Date('2024-01-15T10:00:00Z'),
      });

      expect(mockPrisma.boostAttributionEvent.create).toHaveBeenCalled();
      expect(result.id).toBe('event-1');
    });

    it('should handle optional fields', async () => {
      const eventWithoutOptionals = {
        ...mockAttributionEvent,
        sessionId: null,
        userId: null,
        eventValue: null,
        eventMetadata: null,
      };
      mockPrisma.boostAttributionEvent.create.mockResolvedValue(eventWithoutOptionals);

      const result = await service.trackAttributionEvent({
        boostCampaignId: 'boost-1',
        eventType: 'VIEW' as any,
        touchpointType: 'ORGANIC' as any,
        platform: 'INSTAGRAM',
        occurredAt: new Date(),
      });

      expect(result.sessionId).toBeNull();
      expect(result.userId).toBeNull();
    });
  });

  describe('calculateAttribution - Linear', () => {
    it('should calculate linear attribution with mixed touchpoints', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'ENGAGEMENT' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CLICK' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION' },
      ]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.LINEAR);

      expect(result.model).toBe(AttributionModel.LINEAR);
      expect(result.organicContribution).toBe(0.5);
      expect(result.paidContribution).toBe(0.5);
      expect(result.confidence).toBe(0.8);
    });

    it('should return empty attribution when no events', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.LINEAR);

      expect(result.confidence).toBe(0);
      expect(result.organicContribution).toBe(0);
      expect(result.paidContribution).toBe(0);
      expect(result.details.totalTouchpoints).toBe(0);
    });

    it('should handle non-negative overlap with rounding edge case', async () => {
      // Case: 1 organic, 1 paid, 1 conversion
      // Both round to 1, but overlap should never be negative
      const events = [
        { id: '1', touchpointType: 'ORGANIC', eventType: 'VIEW', occurredAt: new Date() },
        { id: '2', touchpointType: 'PAID', eventType: 'CLICK', occurredAt: new Date() },
        { id: '3', touchpointType: 'ORGANIC', eventType: 'CONVERSION', occurredAt: new Date() },
      ];

      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue(events);

      const result = await service.calculateAttribution('boost-1', AttributionModel.LINEAR);

      expect(result.details.attributedOverlap).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateAttribution - Time Decay', () => {
    it('should weight recent touchpoints more heavily', async () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const old = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14); // 14 days ago

      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', occurredAt: old },
        { ...mockAttributionEvent, touchpointType: 'PAID', occurredAt: recent },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION', occurredAt: recent },
      ]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.TIME_DECAY);

      expect(result.model).toBe(AttributionModel.TIME_DECAY);
      expect(result.paidContribution).toBeGreaterThan(result.organicContribution);
      expect(result.confidence).toBe(0.85);
    });

    it('should return empty attribution when no events', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.TIME_DECAY);

      expect(result.confidence).toBe(0);
    });
  });

  describe('calculateAttribution - Position-Based', () => {
    it('should give 40% to first and last touchpoints', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CLICK' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION' },
      ]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.POSITION_BASED);

      expect(result.model).toBe(AttributionModel.POSITION_BASED);
      expect(result.confidence).toBe(0.9);
      // First: ORGANIC (40%), Middle: PAID (20%), Last: PAID (40%)
      expect(result.organicContribution).toBeCloseTo(0.4, 1);
      expect(result.paidContribution).toBeCloseTo(0.6, 1);
    });

    it('should handle single touchpoint with full credit', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'CONVERSION' },
      ]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.POSITION_BASED);

      expect(result.organicContribution).toBe(1);
      expect(result.paidContribution).toBe(0);
    });

    it('should handle two touchpoints (first and last only)', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION' },
      ]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.POSITION_BASED);

      // First: ORGANIC (40%), Last: PAID (40%), no middle
      expect(result.organicContribution).toBeCloseTo(0.5, 1);
      expect(result.paidContribution).toBeCloseTo(0.5, 1);
    });

    it('should return empty attribution when no events', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([]);

      const result = await service.calculateAttribution('boost-1', AttributionModel.POSITION_BASED);

      expect(result.confidence).toBe(0);
    });
  });

  describe('getAttributionReport', () => {
    it('should generate a comprehensive attribution report', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CLICK' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION' },
      ]);

      const result = await service.getAttributionReport('boost-1');

      expect(result.boostCampaignId).toBe('boost-1');
      expect(result.results).toHaveLength(3);
      expect(result.recommendedModel).toBeDefined();
      expect(result.summary.totalConversions).toBe(1);
    });

    it('should recommend the model with highest confidence', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CONVERSION' },
      ]);

      const result = await service.getAttributionReport('boost-1');

      // Position-based has confidence 0.9, which is highest
      expect(result.recommendedModel).toBe(AttributionModel.POSITION_BASED);
    });
  });

  describe('overlapContribution edge cases', () => {
    it('should ensure overlap is never negative across all models', async () => {
      mockPrisma.boostAttributionEvent.findMany.mockResolvedValue([
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'VIEW' },
        { ...mockAttributionEvent, touchpointType: 'ORGANIC', eventType: 'ENGAGEMENT' },
        { ...mockAttributionEvent, touchpointType: 'PAID', eventType: 'CLICK' },
      ]);

      const linearResult = await service.calculateAttribution('boost-1', AttributionModel.LINEAR);
      const timeDecayResult = await service.calculateAttribution('boost-1', AttributionModel.TIME_DECAY);
      const positionResult = await service.calculateAttribution('boost-1', AttributionModel.POSITION_BASED);

      expect(linearResult.overlapContribution).toBeGreaterThanOrEqual(0);
      expect(timeDecayResult.overlapContribution).toBeGreaterThanOrEqual(0);
      expect(positionResult.overlapContribution).toBeGreaterThanOrEqual(0);

      expect(linearResult.details.attributedOverlap).toBeGreaterThanOrEqual(0);
      expect(timeDecayResult.details.attributedOverlap).toBeGreaterThanOrEqual(0);
      expect(positionResult.details.attributedOverlap).toBeGreaterThanOrEqual(0);
    });
  });
});

