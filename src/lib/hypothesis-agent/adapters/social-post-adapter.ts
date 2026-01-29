/**
 * Social Post Adapter
 * Epic #516
 *
 * Adapter for A/B testing social media posts.
 */

import { BaseContentAdapter } from "./base-adapter";
import type {
  SocialPostContent,
  DeliveryContext,
  ExperimentEventData,
} from "@/types/hypothesis-agent";
import type { ExperimentVariant } from "@prisma/client";
import { trackEvent } from "../core/event-tracker";

export class SocialPostAdapter extends BaseContentAdapter<SocialPostContent, { accountId: string }> {
  readonly contentType = "social_post";
  readonly name = "Social Post";

  validateContent(content: SocialPostContent): boolean {
    return !!(
      content &&
      typeof content === "object" &&
      content.platform &&
      content.content &&
      typeof content.content === "string" &&
      content.variationType
    );
  }

  validateConfig(config: { accountId: string }): boolean {
    return !!(config && config.accountId);
  }

  async deliverVariant(variant: ExperimentVariant, context: DeliveryContext): Promise<void> {
    // For social posts, delivery means selecting which variant content to post
    // The actual posting would be done by the social media integration
    const content = variant.content as SocialPostContent;

    // Track impression
    await this.trackEvent(context.experimentId, variant.id, {
      eventType: "impression",
      visitorId: context.visitorId,
      userId: context.userId,
      metadata: {
        platform: content.platform,
        variationType: content.variationType,
      },
    });

    // Return variant content for posting
    // In a real implementation, this would integrate with social media APIs
  }

  async trackEvent(
    experimentId: string,
    variantId: string,
    event: ExperimentEventData
  ): Promise<void> {
    await trackEvent(experimentId, variantId, event);
  }
}
