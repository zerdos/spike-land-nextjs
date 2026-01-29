/**
 * Attribution Service - Issue #570
 *
 * Tracks user touchpoints and calculates attribution between organic
 * and paid sources using multiple attribution models.
 */

import { PrismaClient } from '@/generated/prisma';
import type {
  AttributionEventType,
  AttributionReport,
  AttributionResult,
  BoostAttributionEvent,
  TouchpointType,
} from '@spike-npm-land/shared/types';
import { AttributionModel } from '@spike-npm-land/shared/types';

interface AttributionEventInput {
  boostCampaignId: string;
  sessionId?: string;
  userId?: string;
  eventType: AttributionEventType;
  touchpointType: TouchpointType;
  platform: string;
  eventValue?: number;
  eventMetadata?: Record<string, unknown>;
  occurredAt: Date;
}

export class AttributionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Track a new attribution event
   */
  async trackAttributionEvent(
    event: AttributionEventInput
  ): Promise<BoostAttributionEvent> {
    const attributionEvent = await this.prisma.boostAttributionEvent.create({
      data: {
        boostCampaignId: event.boostCampaignId,
        sessionId: event.sessionId || null,
        userId: event.userId || null,
        eventType: event.eventType,
        touchpointType: event.touchpointType,
        platform: event.platform,
        eventValue: event.eventValue || null,
        eventMetadata: event.eventMetadata as any,
        occurredAt: event.occurredAt,
      },
    });

    return this.mapToAttributionEvent(attributionEvent);
  }

  /**
   * Calculate attribution using specified model
   */
  async calculateAttribution(
    boostId: string,
    model: AttributionModel
  ): Promise<AttributionResult> {
    // Fetch all attribution events for this boost
    const events = await this.prisma.boostAttributionEvent.findMany({
      where: { boostCampaignId: boostId },
      orderBy: { occurredAt: 'asc' },
    });

    const conversions = events.filter(
      (e) => e.eventType === 'CONVERSION'
    );

    switch (model) {
      case AttributionModel.LINEAR:
        return this.calculateLinearAttribution(boostId, events, conversions);
      case AttributionModel.TIME_DECAY:
        return this.calculateTimeDecayAttribution(boostId, events, conversions);
      case AttributionModel.POSITION_BASED:
        return this.calculatePositionBasedAttribution(boostId, events, conversions);
      default:
        return this.calculateLinearAttribution(boostId, events, conversions);
    }
  }

  /**
   * Get comprehensive attribution report
   */
  async getAttributionReport(boostId: string): Promise<AttributionReport> {
    // Calculate attribution using all models
    const linearResult = await this.calculateAttribution(boostId, AttributionModel.LINEAR);
    const timeDecayResult = await this.calculateAttribution(boostId, AttributionModel.TIME_DECAY);
    const positionBasedResult = await this.calculateAttribution(boostId, AttributionModel.POSITION_BASED);

    const results = [linearResult, timeDecayResult, positionBasedResult];

    // Recommend the model with highest confidence
    const recommendedModel = results.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    ).model;

    // Calculate overall summary
    const avgOrganic = results.reduce((sum, r) => sum + r.organicContribution, 0) / results.length;
    const avgPaid = results.reduce((sum, r) => sum + r.paidContribution, 0) / results.length;
    const avgOverlap = results.reduce((sum, r) => sum + r.overlapContribution, 0) / results.length;

    return {
      boostCampaignId: boostId,
      generatedAt: new Date(),
      results,
      recommendedModel,
      summary: {
        totalConversions: linearResult.details.conversions,
        organicPercentage: avgOrganic,
        paidPercentage: avgPaid,
        overlapPercentage: avgOverlap,
      },
    };
  }

  /**
   * Linear Attribution: Equal credit to all touchpoints
   */
  private async calculateLinearAttribution(
    boostId: string,
    events: any[],
    conversions: any[]
  ): Promise<AttributionResult> {
    const organicTouchpoints = events.filter((e) => e.touchpointType === 'ORGANIC');
    const paidTouchpoints = events.filter((e) => e.touchpointType === 'PAID');
    const totalTouchpoints = events.length;

    if (totalTouchpoints === 0) {
      return this.getEmptyAttribution(boostId, AttributionModel.LINEAR);
    }

    const organicContribution = organicTouchpoints.length / totalTouchpoints;
    const paidContribution = paidTouchpoints.length / totalTouchpoints;

    // Calculate attributed conversions
    const attributedOrganic = Math.round(conversions.length * organicContribution);
    const attributedPaid = Math.round(conversions.length * paidContribution);
    const attributedOverlap = Math.max(0, conversions.length - attributedOrganic - attributedPaid);

    return {
      boostCampaignId: boostId,
      model: AttributionModel.LINEAR,
      organicContribution,
      paidContribution,
      overlapContribution: Math.max(0, 1 - organicContribution - paidContribution),
      confidence: 0.8, // Linear model has moderate confidence
      details: {
        totalTouchpoints,
        organicTouchpoints: organicTouchpoints.length,
        paidTouchpoints: paidTouchpoints.length,
        conversions: conversions.length,
        attributedOrganic,
        attributedPaid,
        attributedOverlap: Math.max(0, attributedOverlap),
      },
    };
  }

  /**
   * Time Decay Attribution: More credit to recent touchpoints
   */
  private async calculateTimeDecayAttribution(
    boostId: string,
    events: any[],
    conversions: any[]
  ): Promise<AttributionResult> {
    if (events.length === 0) {
      return this.getEmptyAttribution(boostId, AttributionModel.TIME_DECAY);
    }

    // Half-life of 7 days
    const halfLifeDays = 7;
    const now = new Date();

    // Calculate weighted scores
    let totalOrganicWeight = 0;
    let totalPaidWeight = 0;

    for (const event of events) {
      const daysSinceEvent =
        (now.getTime() - new Date(event.occurredAt).getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.pow(0.5, daysSinceEvent / halfLifeDays);

      if (event.touchpointType === 'ORGANIC') {
        totalOrganicWeight += weight;
      } else if (event.touchpointType === 'PAID') {
        totalPaidWeight += weight;
      }
    }

    const totalWeight = totalOrganicWeight + totalPaidWeight;
    const organicContribution = totalWeight > 0 ? totalOrganicWeight / totalWeight : 0;
    const paidContribution = totalWeight > 0 ? totalPaidWeight / totalWeight : 0;

    const organicTouchpoints = events.filter((e) => e.touchpointType === 'ORGANIC').length;
    const paidTouchpoints = events.filter((e) => e.touchpointType === 'PAID').length;

    const attributedOrganic = Math.round(conversions.length * organicContribution);
    const attributedPaid = Math.round(conversions.length * paidContribution);
    const attributedOverlap = Math.max(0, conversions.length - attributedOrganic - attributedPaid);

    return {
      boostCampaignId: boostId,
      model: AttributionModel.TIME_DECAY,
      organicContribution,
      paidContribution,
      overlapContribution: Math.max(0, 1 - organicContribution - paidContribution),
      confidence: 0.85, // Time decay has higher confidence for recent campaigns
      details: {
        totalTouchpoints: events.length,
        organicTouchpoints,
        paidTouchpoints,
        conversions: conversions.length,
        attributedOrganic,
        attributedPaid,
        attributedOverlap: Math.max(0, attributedOverlap),
      },
    };
  }

  /**
   * Position-Based Attribution: More credit to first and last touchpoints
   */
  private async calculatePositionBasedAttribution(
    boostId: string,
    events: any[],
    conversions: any[]
  ): Promise<AttributionResult> {
    if (events.length === 0) {
      return this.getEmptyAttribution(boostId, AttributionModel.POSITION_BASED);
    }

    // 40% to first, 40% to last, 20% split among middle
    const firstWeight = 0.4;
    const lastWeight = 0.4;
    const middleWeight = 0.2;

    let organicScore = 0;
    let paidScore = 0;

    if (events.length === 1) {
      // Single touchpoint gets full credit
      if (events[0].touchpointType === 'ORGANIC') {
        organicScore = 1;
      } else {
        paidScore = 1;
      }
    } else {
      // First touchpoint
      if (events[0].touchpointType === 'ORGANIC') {
        organicScore += firstWeight;
      } else {
        paidScore += firstWeight;
      }

      // Last touchpoint
      const lastEvent = events[events.length - 1];
      if (lastEvent.touchpointType === 'ORGANIC') {
        organicScore += lastWeight;
      } else {
        paidScore += lastWeight;
      }

      // Middle touchpoints
      if (events.length > 2) {
        const middleEvents = events.slice(1, -1);
        const weightPerMiddle = middleWeight / middleEvents.length;

        for (const event of middleEvents) {
          if (event.touchpointType === 'ORGANIC') {
            organicScore += weightPerMiddle;
          } else {
            paidScore += weightPerMiddle;
          }
        }
      }
    }

    const totalScore = organicScore + paidScore;
    const organicContribution = totalScore > 0 ? organicScore / totalScore : 0;
    const paidContribution = totalScore > 0 ? paidScore / totalScore : 0;

    const organicTouchpoints = events.filter((e) => e.touchpointType === 'ORGANIC').length;
    const paidTouchpoints = events.filter((e) => e.touchpointType === 'PAID').length;

    const attributedOrganic = Math.round(conversions.length * organicContribution);
    const attributedPaid = Math.round(conversions.length * paidContribution);
    const attributedOverlap = Math.max(0, conversions.length - attributedOrganic - attributedPaid);

    return {
      boostCampaignId: boostId,
      model: AttributionModel.POSITION_BASED,
      organicContribution,
      paidContribution,
      overlapContribution: Math.max(0, 1 - organicContribution - paidContribution),
      confidence: 0.9, // Position-based has high confidence
      details: {
        totalTouchpoints: events.length,
        organicTouchpoints,
        paidTouchpoints,
        conversions: conversions.length,
        attributedOrganic,
        attributedPaid,
        attributedOverlap: Math.max(0, attributedOverlap),
      },
    };
  }

  /**
   * Get empty attribution result
   */
  private getEmptyAttribution(
    boostId: string,
    model: AttributionModel
  ): AttributionResult {
    return {
      boostCampaignId: boostId,
      model,
      organicContribution: 0,
      paidContribution: 0,
      overlapContribution: 0,
      confidence: 0,
      details: {
        totalTouchpoints: 0,
        organicTouchpoints: 0,
        paidTouchpoints: 0,
        conversions: 0,
        attributedOrganic: 0,
        attributedPaid: 0,
        attributedOverlap: 0,
      },
    };
  }

  /**
   * Map Prisma model to BoostAttributionEvent type
   */
  private mapToAttributionEvent(event: any): BoostAttributionEvent {
    return {
      id: event.id,
      boostCampaignId: event.boostCampaignId,
      sessionId: event.sessionId,
      userId: event.userId,
      eventType: event.eventType as AttributionEventType,
      touchpointType: event.touchpointType as TouchpointType,
      platform: event.platform,
      eventValue: event.eventValue,
      eventMetadata: event.eventMetadata,
      occurredAt: event.occurredAt,
      createdAt: event.createdAt,
    };
  }
}
