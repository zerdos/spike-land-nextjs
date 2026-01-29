/**
 * Base Content Adapter
 * Epic #516
 *
 * Abstract base class that all content adapters must extend.
 */

import type {
  ContentAdapter,
  DeliveryContext,
  ExperimentEventData,
} from "@/types/hypothesis-agent";
import type { ExperimentVariant } from "@prisma/client";

/**
 * Abstract base adapter class.
 *
 * All content type adapters must extend this class and implement
 * the required methods.
 */
export abstract class BaseContentAdapter<TContent = unknown, TConfig = unknown>
  implements ContentAdapter<TContent, TConfig>
{
  abstract readonly contentType: string;
  abstract readonly name: string;

  /**
   * Validate that content structure matches expected format.
   */
  abstract validateContent(content: TContent): boolean;

  /**
   * Validate adapter-specific configuration.
   */
  abstract validateConfig(config: TConfig): boolean;

  /**
   * Assign a variant to a visitor.
   *
   * Base implementation uses weighted random selection.
   * Override for custom assignment logic.
   */
  async assignVariant(
    experimentId: string,
    variants: ExperimentVariant[],
    visitorId: string
  ): Promise<ExperimentVariant> {
    if (variants.length === 0) {
      throw new Error("No variants available");
    }

    if (variants.length === 1) {
      const first = variants[0];
      if (!first) throw new Error("Variant is undefined");
      return first;
    }

    // Use hash-based assignment for consistency
    const hash = await this.hashVisitorId(experimentId, visitorId);
    const hashValue = hash % 100; // 0-99

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.splitPercentage;
      if (hashValue < cumulative) {
        return variant;
      }
    }

    // Fallback to last variant
    const last = variants[variants.length - 1];
    if (!last) throw new Error("No variants available");
    return last;
  }

  /**
   * Deliver variant content to the user.
   *
   * Must be implemented by each adapter based on content type.
   */
  abstract deliverVariant(
    variant: ExperimentVariant,
    context: DeliveryContext
  ): Promise<void>;

  /**
   * Track an event for this experiment.
   *
   * Base implementation can be overridden for custom tracking.
   */
  abstract trackEvent(
    experimentId: string,
    variantId: string,
    event: ExperimentEventData
  ): Promise<void>;

  /**
   * Get human-readable description of this adapter.
   */
  getDescription(): string {
    return `${this.name} adapter for ${this.contentType} content`;
  }

  /**
   * Hash visitor ID for consistent variant assignment.
   */
  protected async hashVisitorId(experimentId: string, visitorId: string): Promise<number> {
    const str = `${experimentId}:${visitorId}`;
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Validate experiment variant content using adapter's content schema.
   */
  validateVariant(variant: ExperimentVariant): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const content = variant.content as TContent;
      const isValid = this.validateContent(content);

      if (!isValid) {
        errors.push(`Invalid content structure for ${this.contentType}`);
      }
    } catch (error) {
      errors.push(`Content validation error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
