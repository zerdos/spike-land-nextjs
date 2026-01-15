/**
 * Type definitions for Allocator API responses used in E2E tests
 */

export interface CampaignMetrics {
  roas?: number;
  cpa?: number;
  ctr?: number;
  conversionRate?: number;
  spend?: number;
  conversions?: number;
}

export interface CampaignTrend {
  roas?: string;
  cpa?: string;
  direction?: string;
}

export interface CampaignAnalysis {
  id?: string;
  name?: string;
  platform?: string;
  performanceScore?: number;
  efficiencyScore?: number;
  metrics?: CampaignMetrics;
  trend?: CampaignTrend;
  daysAnalyzed?: number;
  accountId?: string;
}

export interface ConfidenceInterval {
  low?: number;
  high?: number;
}

export interface ProjectedImpact {
  estimatedRoasChange?: number;
  estimatedCpaChange?: number;
  confidenceInterval?: ConfidenceInterval;
  confidence_interval?: ConfidenceInterval;
  interval?: ConfidenceInterval;
  roasChange?: number;
  cpaChange?: number;
  roas?: number;
  cpa?: number;
}

export interface Recommendation {
  id?: string;
  type?: string;
  confidence?: string;
  confidenceLevel?: string;
  sourceCampaign?: { id?: string; name?: string; };
  targetCampaign?: { id?: string; name?: string; };
  source?: { id?: string; name?: string; };
  target?: { id?: string; name?: string; };
  suggestedBudgetChange?: number;
  estimatedSpendChange?: number;
  suggestedChange?: string;
  reason?: string;
  reasoning?: string;
  explanation?: string;
  supportingData?: Array<{ metric?: string; value?: number; trend?: string; }>;
  supporting_data?: Array<{ metric?: string; value?: number; trend?: string; }>;
  createdAt?: string;
  created_at?: string;
  expiresAt?: string;
  expires_at?: string;
  projectedImpact?: ProjectedImpact;
  impact?: ProjectedImpact;
  estimatedImpact?: ProjectedImpact;
}

export interface AllocatorSummary {
  totalCampaignsAnalyzed?: number;
  averageRoas?: number;
  averageCpa?: number;
  projectedTotalImpact?: { roas?: number; cpa?: number; };
  projectedImpact?: { roas?: number; cpa?: number; };
  dataQualityScore?: number;
}

export interface AllocatorApiResponse {
  campaignAnalyses?: CampaignAnalysis[];
  recommendations?: Recommendation[];
  summary?: AllocatorSummary;
  dataQualityScore?: number;
  hasEnoughData?: boolean;
  overview?: {
    totalSpend?: number;
    campaignCount?: number;
    averageRoas?: number;
    projectedRoasImprovement?: number;
    averageCpa?: number;
    projectedCpaSavings?: number;
    dataQuality?: number;
  };
  message?: string;
}
