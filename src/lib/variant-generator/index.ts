/**
 * Variant Generator Module
 *
 * AI-powered marketing copy variant generation, image suggestions,
 * performance scoring, and A/B testing.
 *
 * Resolves #551
 */

export {
  generateCopyVariants,
  isClaudeConfigured,
} from "./copy-generator";

export {
  suggestImagesForCopy,
  suggestMultipleImages,
} from "./image-suggester";

export {
  scoreVariant,
  scoreAndRankVariants,
} from "./variant-scorer";

export {
  calculateSignificance,
  calculateSampleSize,
  calculateConfidenceInterval,
  shouldStopTest,
} from "./ab-test-calculator";

// Re-export types for convenience
export type {
  CopyTone,
  CopyLength,
  CtaStyle,
  VariationType,
  VariantGenerationParams,
  CopyVariant,
  ImageSuggestion,
  VariantScore,
  BatchGenerationRequest,
  BatchGenerationResponse,
  VariantGenerationJobStatus,
  StatisticalSignificance,
  AbTestVariantMetrics,
  AbTestConfig,
  HistoricalPerformanceData,
  BrandVoiceParams,
} from "@/types/variant-generator";
