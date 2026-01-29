/**
 * Generic Content Adapter
 * Epic #516
 *
 * Flexible adapter for any content type.
 */

import { BaseContentAdapter } from "./base-adapter";
import type {
  GenericContent,
  DeliveryContext,
  ExperimentEventData,
} from "@/types/hypothesis-agent";
import type { ExperimentVariant } from "@prisma/client";
import { trackEvent } from "../core/event-tracker";

export class GenericContentAdapter extends BaseContentAdapter<
  GenericContent,
  Record<string, unknown>
> {
  readonly contentType = "generic";
  readonly name = "Generic Content";

  validateContent(content: GenericContent): boolean {
    return !!(content && typeof content === "object" && content.content);
  }

  validateConfig(_config: Record<string, unknown>): boolean {
    return true; // Generic adapter accepts any config
  }

  async deliverVariant(variant: ExperimentVariant, context: DeliveryContext): Promise<void> {
    // Track impression
    await this.trackEvent(context.experimentId, variant.id, {
      eventType: "impression",
      visitorId: context.visitorId,
      userId: context.userId,
      metadata: context.metadata,
    });

    // Generic delivery - return content as-is
    // Implementation depends on specific use case
  }

  async trackEvent(
    experimentId: string,
    variantId: string,
    event: ExperimentEventData
  ): Promise<void> {
    await trackEvent(experimentId, variantId, event);
  }
}
