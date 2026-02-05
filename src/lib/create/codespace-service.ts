import logger from "@/lib/logger";

const TESTING_SPIKE_LAND = process.env["TESTING_SPIKE_LAND_URL"] || "https://testing.spike.land";

export interface CodespaceResponse {
  success: boolean;
  error?: string;
  url?: string;
}

/**
 * Creates or updates a codespace with the given code.
 * Reuses the existing infrastructure by calling the REST API directly.
 */
export async function updateCodespace(
  codespaceId: string,
  code: string,
): Promise<CodespaceResponse> {
  try {
    const url = `${TESTING_SPIKE_LAND}/live/${codespaceId}/api/code`;

    // We want to run it immediately
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        run: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Failed to update codespace ${codespaceId}: ${response.status} ${text}`);
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
      return {
        success: false,
        error: data.error || "Unknown error updating codespace",
      };
    }
  } catch (error) {
    logger.error(`Error updating codespace ${codespaceId}:`, { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
