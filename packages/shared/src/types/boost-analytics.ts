/**
 * Boost Analytics Types - Issue #570
 *
 * Comprehensive types for the feedback loop analytics system that measures
 * the effectiveness of boosting organic content to paid ads.
 */

// =============================================================================
// Enums
// =============================================================================

export enum BoostStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AttributionEventType {
  VIEW = 'VIEW',
  CLICK = 'CLICK',
  ENGAGEMENT = 'ENGAGEMENT',
  CONVERSION = 'CONVERSION',
  SHARE = 'SHARE',
}

export enum TouchpointType {
  ORGANIC = 'ORGANIC',
  PAID = 'PAID',
  UNKNOWN = 'UNKNOWN',
}

export enum RecommendationType {
  BOOST_HIGH_PERFORMER = 'BOOST_HIGH_PERFORMER',
  BOOST_TRENDING = 'BOOST_TRENDING',
  OPTIMIZE_TARGETING = 'OPTIMIZE_TARGETING',
  INCREASE_BUDGET = 'INCREASE_BUDGET',
  ADJUST_TIMING = 'ADJUST_TIMING',
  REPLICATE_SUCCESS = 'REPLICATE_SUCCESS',
}

export enum RecommendationStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  DISMISSED = 'DISMISSED',
  EXPIRED = 'EXPIRED',
}

export enum InsightType {
  PATTERN = 'PATTERN',
  ANOMALY = 'ANOMALY',
  BEST_PRACTICE = 'BEST_PRACTICE',
  WARNING = 'WARNING',
  OPPORTUNITY = 'OPPORTUNITY',
}

export enum InsightCategory {
  TIMING = 'TIMING',
  TARGETING = 'TARGETING',
  BUDGET = 'BUDGET',
  CONTENT_TYPE = 'CONTENT_TYPE',
  PLATFORM = 'PLATFORM',
  AUDIENCE = 'AUDIENCE',
}

export enum InsightSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// =============================================================================
// Data Structures
// =============================================================================

/**
 * Snapshot of organic metrics captured before boosting
 */
export interface OrganicMetricsSnapshot {
  impressions: number;
  engagement: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  capturedAt: Date;
}

/**
 * Targeting criteria for boost campaigns
 */
export interface TargetingCriteria {
  demographics?: {
    ageMin?: number;
    ageMax?: number;
    genders?: string[];
    languages?: string[];
  };
  interests?: string[];
  locations?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
  };
  behaviors?: string[];
  customAudiences?: string[];
}

/**
 * Boost campaign data with all metadata
 */
export interface BoostCampaignData {
  id: string;
  workspaceId: string;
  originalPostId: string | null;
  campaignId: string;
  boostedAt: Date;
  boostedBy: string;
  boostReason: string;
  boostStrategy: string;
  organicMetrics: OrganicMetricsSnapshot;
  targetingCriteria: TargetingCriteria | null;
  initialBudget: number; // in cents
  duration: number; // in days
  status: BoostStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Performance metrics aggregated by source (organic vs paid)
 */
export interface BoostPerformanceMetrics {
  organic: {
    impressions: number;
    engagements: number;
    reach: number;
  };
  paid: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number; // in cents
    ctr: number; // click-through rate (0-1)
    cpa: number; // cost per acquisition in cents
    roas: number; // return on ad spend
  };
  attribution: {
    organic: number; // conversions attributed to organic
    paid: number; // conversions attributed to paid
    overlap: number; // conversions with both touchpoints
  };
  computed: {
    incrementalReach: number; // paid reach - organic reach overlap
    costPerResult: number; // paidSpend / (paidConversions + attributedOverlap)
    totalRoi: number; // (total value - cost) / cost
  };
}

/**
 * Time-series snapshot of boost performance
 */
export interface BoostPerformanceSnapshot {
  id: string;
  boostCampaignId: string;
  snapshotAt: Date;
  daysSinceBoosted: number;
  metrics: BoostPerformanceMetrics;
  createdAt: Date;
}

/**
 * Attribution event for tracking user interactions
 */
export interface BoostAttributionEvent {
  id: string;
  boostCampaignId: string;
  sessionId: string | null;
  userId: string | null;
  eventType: AttributionEventType;
  touchpointType: TouchpointType;
  platform: string; // e.g., "FACEBOOK", "INSTAGRAM"
  eventValue: number | null; // in cents, for conversion events
  eventMetadata: Record<string, unknown> | null;
  occurredAt: Date;
  createdAt: Date;
}

/**
 * Attribution result with model-calculated splits
 */
export interface AttributionResult {
  boostCampaignId: string;
  model: AttributionModel;
  organicContribution: number; // 0-1 (percentage)
  paidContribution: number; // 0-1 (percentage)
  overlapContribution: number; // 0-1 (percentage)
  confidence: number; // 0-1 confidence score
  details: {
    totalTouchpoints: number;
    organicTouchpoints: number;
    paidTouchpoints: number;
    conversions: number;
    attributedOrganic: number;
    attributedPaid: number;
    attributedOverlap: number;
  };
}

/**
 * Attribution model types
 */
export enum AttributionModel {
  LINEAR = 'LINEAR',
  TIME_DECAY = 'TIME_DECAY',
  POSITION_BASED = 'POSITION_BASED',
  ML_BASED = 'ML_BASED',
}

/**
 * Full attribution report
 */
export interface AttributionReport {
  boostCampaignId: string;
  generatedAt: Date;
  results: AttributionResult[];
  recommendedModel: AttributionModel;
  summary: {
    totalConversions: number;
    organicPercentage: number;
    paidPercentage: number;
    overlapPercentage: number;
  };
}

// =============================================================================
// Analytics & Insights
// =============================================================================

/**
 * Comprehensive analysis of boost effectiveness
 */
export interface BoostEffectivenessAnalysis {
  boostCampaignId: string;
  overallScore: number; // 0-100
  metrics: BoostPerformanceMetrics;
  comparison: {
    organicOnlyProjected: number; // What would have happened without boost?
    actualWithBoost: number;
    lift: number; // % improvement (0-1)
  };
  costEfficiency: {
    costPerIncremental: number; // cost per incremental result in cents
    organicVsPaidCostRatio: number;
  };
  recommendations: string[];
}

/**
 * Boost insight data
 */
export interface BoostInsightData {
  id: string;
  workspaceId: string;
  insightType: InsightType;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  visualization: ChartData | null;
  dataPoints: Record<string, unknown>;
  comparisonMetrics: ComparisonMetrics | null;
  actionable: boolean;
  suggestedActions: SuggestedAction[] | null;
  periodStart: Date;
  periodEnd: Date;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

/**
 * Chart data for visualizations
 */
export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color?: string;
    }[];
  };
}

/**
 * Comparison metrics for insights
 */
export interface ComparisonMetrics {
  before: Record<string, number>;
  after: Record<string, number>;
  change: Record<string, number>;
  changePercentage: Record<string, number>;
}

/**
 * Suggested action from an insight
 */
export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  priority: number; // 1-5
  estimatedImpact: string; // e.g., "High", "Medium", "Low"
  category: InsightCategory;
}

// =============================================================================
// ML Recommendations
// =============================================================================

/**
 * ML-generated boost recommendation
 */
export interface BoostRecommendationData {
  id: string;
  workspaceId: string;
  suggestedPostId: string | null;
  recommendationType: RecommendationType;
  confidence: number; // 0-1
  priority: number; // 1-5
  suggestedBudget: number; // in cents
  suggestedDuration: number; // in days
  suggestedTiming: Date;
  suggestedTargeting: TargetingCriteria;
  projectedReach: number;
  projectedConversions: number;
  projectedRoi: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  reason: string;
  supportingData: Record<string, unknown>;
  status: RecommendationStatus;
  appliedAt: Date | null;
  resultingBoostId: string | null;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * ML training data features
 */
export interface MLFeatures {
  // Content features
  contentType: string;
  contentLength: number;
  sentimentScore: number;
  mediaCount: number;
  hasVideo: boolean;
  hasImage: boolean;

  // Timing features
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  isWeekend: boolean;
  seasonality: number; // 0-3 (quarter of year)

  // Audience features
  followerCount: number;
  avgEngagementRate: number;
  avgReach: number;

  // Historical features
  pastBoostCount: number;
  avgPastRoi: number;
  avgPastCpa: number;

  // Context features
  industryTrend: number;
  competitorActivity: number;
}

/**
 * ML training data labels (outcomes)
 */
export interface MLLabels {
  conversionRate: number;
  roi: number;
  engagementLift: number;
  costPerResult: number;
  reachLift: number;
  success: boolean; // Overall success indicator
}

/**
 * ML training data record
 */
export interface MLTrainingDataRecord {
  id: string;
  workspaceId: string;
  boostCampaignId: string;
  features: MLFeatures;
  labels: MLLabels;
  dataQualityScore: number; // 0-1
  isTrainingReady: boolean;
  aggregatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Predicted outcome for a boost campaign
 */
export interface PredictedOutcome {
  confidence: number; // 0-1
  projectedReach: number;
  projectedConversions: number;
  projectedRoi: number;
  projectedCostPerResult: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  riskFactors: string[];
  successProbability: number; // 0-1
}

/**
 * Targeting recommendation from ML
 */
export interface TargetingRecommendation {
  recommendedCriteria: TargetingCriteria;
  confidence: number;
  reasoning: string;
  expectedImprovement: number; // % improvement in ROI
  alternatives: {
    criteria: TargetingCriteria;
    confidence: number;
    expectedImprovement: number;
  }[];
}

/**
 * Budget recommendation from ML
 */
export interface BudgetRecommendation {
  recommendedBudget: number; // in cents
  confidence: number;
  reasoning: string;
  expectedRoi: number;
  minEffectiveBudget: number; // in cents
  maxEffectiveBudget: number; // in cents
  alternatives: {
    budget: number;
    confidence: number;
    expectedRoi: number;
  }[];
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Request to create a new boost campaign
 */
export interface CreateBoostCampaignRequest {
  workspaceId: string;
  originalPostId: string | null;
  campaignId: string;
  boostedBy: string;
  boostReason: string;
  boostStrategy: string;
  organicMetrics: OrganicMetricsSnapshot;
  targetingCriteria?: TargetingCriteria;
  initialBudget: number;
  duration: number;
}

/**
 * Response with boost campaign data
 */
export interface CreateBoostCampaignResponse {
  success: boolean;
  boostCampaign: BoostCampaignData;
}

/**
 * Request to update boost campaign status
 */
export interface UpdateBoostStatusRequest {
  boostCampaignId: string;
  status: BoostStatus;
  reason?: string;
}

/**
 * Filters for listing boost campaigns
 */
export interface BoostCampaignFilters {
  status?: BoostStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minBudget?: number;
  maxBudget?: number;
  boostStrategy?: string;
  sortBy?: 'createdAt' | 'boostedAt' | 'budget' | 'roi';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Request to apply a recommendation
 */
export interface ApplyRecommendationRequest {
  recommendationId: string;
  userId: string;
  overrides?: {
    budget?: number;
    duration?: number;
    timing?: Date;
    targeting?: Partial<TargetingCriteria>;
  };
}

/**
 * Response with applied recommendation result
 */
export interface ApplyRecommendationResponse {
  success: boolean;
  boostCampaign: BoostCampaignData;
  recommendation: BoostRecommendationData;
}

/**
 * Request to acknowledge an insight
 */
export interface AcknowledgeInsightRequest {
  insightId: string;
  userId: string;
  notes?: string;
}

/**
 * Dashboard overview data
 */
export interface DashboardOverview {
  totalBoosts: number;
  activeBoosts: number;
  avgRoi: number;
  totalIncrementalConversions: number;
  totalSpend: number; // in cents
  costSavingsVsOrganic: number; // in cents
  topPerformingBoosts: BoostCampaignData[];
  recentInsights: BoostInsightData[];
  pendingRecommendations: BoostRecommendationData[];
}

// =============================================================================
// Export all types
// =============================================================================

