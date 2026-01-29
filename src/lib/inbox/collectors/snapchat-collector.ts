/**
 * Snapchat Collector
 *
 * Collects Story replies from Snapchat.
 * Note: Snapchat Marketing API has limited social engagement features.
 */

import { BaseCollector } from "../base-collector";
import type { CollectionOptions, CollectionResult, RawSocialMessage } from "../collector-types";

const SNAPCHAT_API_BASE = "https://adsapi.snapchat.com/v1";

export class SnapchatCollector extends BaseCollector {
  readonly platform = "SNAPCHAT" as const;

  /**
   * Make authenticated request to Snapchat API
   */
  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${SNAPCHAT_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      const errorText = await response.text();
      throw new Error(`Snapchat API error: ${response.status} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Check if we can collect from this account
   */
  async canCollect(accessToken: string): Promise<boolean> {
    try {
      await this.makeRequest<{ organizations: unknown[]; }>(
        "/me/organizations",
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collect Story replies from Snapchat
   *
   * Note: Snapchat Marketing API does not provide consumer Story replies.
   * This would require Snap Kit approval and consumer API access.
   * This is a stub implementation for future API expansion.
   */
  async collect(
    accessToken: string,
    accountId: string,
    options?: CollectionOptions,
  ): Promise<CollectionResult> {
    return this.executeWithRetry(async () => {
      // Snapchat Marketing API focuses on ads, not consumer engagement
      // Consumer Story replies require Snap Kit approval

      const messages: RawSocialMessage[] = [];

      return {
        messages,
        hasMore: false,
        nextCursor: undefined,
      };
    });
  }
}
