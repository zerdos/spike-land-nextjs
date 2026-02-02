import type { YouTubeClient } from "../clients/youtube";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface ProcessingStatus {
  status: "processed" | "processing" | "failed" | "timeout";
  processingDetails?: {
    processingStatus: string;
    processingProgress?: {
      partsProcessed: number;
      partsTotal: number;
      timeLeftMs?: number;
    };
    processingFailureReason?: string;
  };
}

/**
 * Polls YouTube API for video processing status
 *
 * @param client - Authenticated YouTube client
 * @param videoId - ID of the video to check
 * @param options - Polling configuration
 * @returns Final processing status
 */
export async function pollVideoProcessingStatus(
  client: YouTubeClient,
  videoId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    timeoutMs?: number;
  },
): Promise<ProcessingStatus> {
  const maxAttempts = options?.maxAttempts || 60; // Default: 60 attempts
  const intervalMs = options?.intervalMs || 5000; // Default: 5 seconds
  const timeoutMs = options?.timeoutMs || 10 * 60 * 1000; // Default: 10 minutes (for polling loop, separate from attempts)

  const startTime = Date.now();
  let attempts = 0;

  // Helper to get access token from client
  const getAccessToken = (): string => {
    const clientWithToken = client as { getAccessTokenOrThrow?: () => string; };
    return clientWithToken.getAccessTokenOrThrow ? clientWithToken.getAccessTokenOrThrow() : "";
  };

  let lastStatus: ProcessingStatus["status"] | undefined;
  let lastDetails: ProcessingStatus["processingDetails"] | undefined;

  while (attempts < maxAttempts) {
    if (Date.now() - startTime > timeoutMs) {
      return { status: "timeout" };
    }

    attempts++;

    try {
      const token = getAccessToken();
      const response = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=processingDetails,status&id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        console.warn(`Polling error: ${response.statusText}`);
      } else {
        const data = await response.json();
        const items = data.items || [];

        if (items.length > 0) {
          const item = items[0];
          const processingDetails = item.processingDetails;
          const status = item.status?.uploadStatus;

          if (
            status === "processed" ||
            processingDetails?.processingStatus === "succeeded"
          ) {
            return {
              status: "processed",
              processingDetails,
            };
          }

          if (
            processingDetails?.processingStatus === "failed" ||
            processingDetails?.processingStatus === "terminated"
          ) {
            return {
              status: "failed",
              processingDetails,
            };
          }

          // Still processing
          lastStatus = "processing";
          lastDetails = processingDetails;
        }
      }
    } catch (error) {
      console.error("Polling exception:", error);
    }

    // If we've reached maxAttempts, don't wait, just check if we have a last known status
    if (attempts >= maxAttempts) {
      break;
    }

    // Wait for interval
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // If we have a last known status, return it (e.g. processing)
  if (lastStatus) {
    return {
      status: lastStatus,
      processingDetails: lastDetails,
    };
  }

  return { status: "timeout" };
}
