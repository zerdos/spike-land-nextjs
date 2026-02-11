import logger from "@/lib/logger";

const TESTING_SPIKE_LAND = process.env["TESTING_SPIKE_LAND_URL"] || "https://testing.spike.land";

const CODESPACE_FETCH_TIMEOUT_MS = 30_000;
const CODESPACE_MAX_RETRIES = 2;
const CODESPACE_RETRY_DELAYS = [1000, 2000];

/** HTTP status codes that indicate transient infrastructure errors worth retrying. */
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

export interface CodespaceResponse {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Creates or updates a codespace with the given code.
 * Retries on transient network/infrastructure errors (502/503/504).
 * Does NOT retry on 4xx or transpile failures.
 */
export async function updateCodespace(
  codespaceId: string,
  code: string,
): Promise<CodespaceResponse> {
  const url = `${TESTING_SPIKE_LAND}/live/${codespaceId}/api/code`;

  for (let attempt = 0; attempt <= CODESPACE_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CODESPACE_FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, run: true }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        logger.error(`Failed to update codespace ${codespaceId}: ${response.status} ${text}`);

        // Retry on transient infrastructure errors
        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < CODESPACE_MAX_RETRIES) {
          const delay = CODESPACE_RETRY_DELAYS[attempt] ?? 1000;
          logger.info(`Retrying codespace update (attempt ${attempt + 1}) after ${delay}ms`, {
            codespaceId,
            status: response.status,
          });
          await sleep(delay);
          continue;
        }

        return {
          success: false,
          error: `Failed to update codespace: ${response.statusText}`,
        };
      }

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          url: `${TESTING_SPIKE_LAND}/live/${codespaceId}/`,
        };
      } else {
        // Transpile/validation failure — NOT retryable
        return {
          success: false,
          error: data.error || "Unknown error updating codespace",
        };
      }
    } catch (error) {
      logger.error(`Error updating codespace ${codespaceId} (attempt ${attempt + 1}):`, { error });

      // Retry on network errors (fetch failures, aborts)
      if (attempt < CODESPACE_MAX_RETRIES) {
        const delay = CODESPACE_RETRY_DELAYS[attempt] ?? 1000;
        logger.info(`Retrying codespace update after network error (${delay}ms)`, { codespaceId });
        await sleep(delay);
        continue;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return { success: false, error: "Codespace update failed after retries" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the live URL for a codespace
 */
export function getCodespaceUrl(codespaceId: string): string {
  return `${TESTING_SPIKE_LAND}/live/${codespaceId}/`;
}

/**
 * Generate a consistent codespace ID from a slug.
 * The backend only allows IDs with at most 2 hyphen-separated parts (e.g., "x-abc123").
 * We use a hash of the slug to ensure uniqueness while staying within constraints.
 * e.g. "cooking/pasta" -> "c-a1b2c3d4"
 */
export function generateCodespaceId(slug: string): string {
  // Create a simple hash from the slug for uniqueness
  // Using a basic hash that produces 8 hex chars
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hashHex = Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
  return `c-${hashHex}`;
}
