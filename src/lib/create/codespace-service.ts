import logger from "@/lib/logger";

const TESTING_SPIKE_LAND = "https://testing.spike.land";

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
 * e.g. "cooking/pasta" -> "create-cooking-pasta"
 */
export function generateCodespaceId(slug: string): string {
  // Replace slashes and other non-alphanumeric chars with hyphens
  const sanitized = slug.toLowerCase().replace(/[^a-z0-9]/g, "-");
  // Ensure it doesn't start or end with hyphen
  const trimmed = sanitized.replace(/^-+|-+$/g, "");
  return `create-${trimmed}`;
}
