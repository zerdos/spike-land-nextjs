import { z } from "zod";

/**
 * Validation schemas for Audience Analysis API
 */

// ============================================================================
// Request Validation
// ============================================================================

export const AnalyzeAudienceRequestSchema = z.object({
  briefId: z.string().min(1, "Brief ID is required"),
});

export type AnalyzeAudienceRequest = z.infer<
  typeof AnalyzeAudienceRequestSchema
>;

// ============================================================================
// Response Validation
// ============================================================================

export const DemographicAnalysisSchema = z.object({
  ageRangeAssessment: z.string(),
  genderDistribution: z.string(),
  locationRelevance: z.string(),
});

export const InterestAlignmentSchema = z.object({
  primaryInterests: z.array(z.string()),
  secondaryInterests: z.array(z.string()),
  conflictingInterests: z.array(z.string()),
});

export const BehaviorPatternsSchema = z.object({
  identifiedBehaviors: z.array(z.string()),
  targetingOpportunities: z.array(z.string()),
});

export const RecommendationsSchema = z.object({
  refinements: z.array(z.string()),
  expansions: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const AudienceInsightsSchema = z.object({
  demographicAnalysis: DemographicAnalysisSchema,
  interestAlignment: InterestAlignmentSchema,
  behaviorPatterns: BehaviorPatternsSchema,
  recommendations: RecommendationsSchema,
});

export const AnalyzeAudienceResponseSchema = z.object({
  score: z.number().min(0).max(100),
  insights: AudienceInsightsSchema,
  suggestions: z.array(z.string()),
});

export type AudienceInsights = z.infer<typeof AudienceInsightsSchema>;
export type AnalyzeAudienceResponse = z.infer<
  typeof AnalyzeAudienceResponseSchema
>;
