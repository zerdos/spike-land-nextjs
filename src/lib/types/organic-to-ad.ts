/**
 * Types for Organic-to-Ad Conversion System
 * Issue: #567 (ORB-063)
 * Epic: #521 (Content-to-Ads Loop)
 */

// ============================================================================
// Platform Types
// ============================================================================

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TWITTER' | 'LINKEDIN' | 'TIKTOK';

export type AdPlacement = 'FEED' | 'STORY' | 'REELS' | 'EXPLORE';

export type CreativeFormat = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'COLLECTION';

// ============================================================================
// Engagement Data Types
// ============================================================================

export interface EngagementData {
  postId: string;
  platform: SocialPlatform;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagementRate: number;
  fetchedAt: Date;
}

export interface EngagerDemographics {
  ageRanges: Record<string, number>; // e.g., { "18-24": 0.3, "25-34": 0.5 }
  genders: Record<string, number>; // e.g., { "male": 0.4, "female": 0.6 }
  locations: Record<string, number>; // e.g., { "US": 0.7, "UK": 0.3 }
  interests: string[];
}

export interface PlatformEngagementResponse {
  platform: SocialPlatform;
  success: boolean;
  data?: EngagementData;
  demographics?: EngagerDemographics;
  error?: string;
}

// ============================================================================
// Targeting Types
// ============================================================================

export interface TargetingOption {
  type: 'demographic' | 'interest' | 'behavior' | 'lookalike';
  key: string;
  value: string | number;
  confidenceScore: number; // 0-1
  source: 'ai' | 'manual' | 'platform';
}

export interface TargetingSuggestion {
  platform: SocialPlatform;
  options: TargetingOption[];
  audienceSize: {
    min: number;
    max: number;
  };
  recommendedBudget?: number;
  generatedAt: Date;
}

// ============================================================================
// Creative Variant Types
// ============================================================================

export interface CreativeVariant {
  id: string;
  format: CreativeFormat;
  placement: AdPlacement;
  content: {
    headline?: string;
    primaryText?: string;
    description?: string;
    callToAction?: string;
  };
  media: {
    url: string;
    type: 'image' | 'video';
    width: number;
    height: number;
    aspectRatio: string;
  };
  adaptations: {
    textLengthOptimized: boolean;
    ctaOptimized: boolean;
    aspectRatioAdjusted: boolean;
  };
}

export interface CreativeAdaptationRequest {
  postId: string;
  platform: SocialPlatform;
  formats: CreativeFormat[];
  placements: AdPlacement[];
}

export interface CreativeAdaptationResponse {
  postId: string;
  variants: CreativeVariant[];
  generatedAt: Date;
}

// ============================================================================
// Budget Recommendation Types
// ============================================================================

export interface BudgetRecommendation {
  daily: number;
  weekly: number;
  monthly: number;
  projectedReach: {
    min: number;
    max: number;
  };
  projectedEngagement: {
    min: number;
    max: number;
  };
  estimatedCostPerResult: number;
  confidenceLevel: number; // 0-1
  rationale: string;
}

export interface BudgetRecommendationRequest {
  postId: string;
  reachGoal: number;
  targetingData: TargetingSuggestion;
  campaignDuration: number; // days
}

// ============================================================================
// Conversion Types
// ============================================================================

export interface OrganicToAdConversionRequest {
  postId: string;
  platform: SocialPlatform;
  targeting: TargetingSuggestion;
  creative: CreativeVariant;
  budget: {
    daily: number;
    total: number;
  };
  startDate: Date;
  endDate?: Date;
}

export interface OrganicToAdConversionResponse {
  conversionId: string;
  campaignId: string;
  status: 'pending' | 'active' | 'failed';
  platformCampaignId?: string;
  error?: string;
  createdAt: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface ConversionPerformance {
  conversionId: string;
  organicMetrics: EngagementData;
  adMetrics: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    conversions: number;
    costPerClick: number;
    costPerConversion: number;
    roi: number;
  };
  comparison: {
    reachMultiplier: number;
    engagementMultiplier: number;
    costPerEngagement: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface OrganicToAdError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Status Enums
// ============================================================================

export enum ConversionStatus {
  DRAFT = 'DRAFT',
  FETCHING_ENGAGEMENT = 'FETCHING_ENGAGEMENT',
  ANALYZING_AUDIENCE = 'ANALYZING_AUDIENCE',
  ADAPTING_CREATIVE = 'ADAPTING_CREATIVE',
  READY_FOR_LAUNCH = 'READY_FOR_LAUNCH',
  LAUNCHING = 'LAUNCHING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum EngagerDataStatus {
  PENDING = 'PENDING',
  FETCHING = 'FETCHING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}
