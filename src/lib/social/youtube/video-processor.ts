
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
  }
): Promise<ProcessingStatus> {
  const maxAttempts = options?.maxAttempts || 60; // Default: 60 attempts
  const intervalMs = options?.intervalMs || 5000; // Default: 5 seconds
  const timeoutMs = options?.timeoutMs || 10 * 60 * 1000; // Default: 10 minutes (for polling loop, separate from attempts)

  const startTime = Date.now();
  let attempts = 0;

  // We need to access a private/protected method or property of the client to get the token.
  // But since we are using the client instance, we can't access private members nicely.
  // We'll cast to any or assume the client has a public way to get the token.
  // YouTubeClient has `getAccessTokenOrThrow` but it is private in the file I read earlier!
  //
  // Checking src/lib/social/clients/youtube.ts:
  // private getAccessTokenOrThrow(): string
  //
  // This is a problem. I cannot call it from here.
  //
  // Solution: Pass the accessToken string directly, OR change the client method to public (which I might do in step 4 anyway).
  // Or, I can rely on the fact that I'm inside the same library boundary? No, separate files.
  //
  // I will assume for now I will make `getAccessTokenOrThrow` public or add a public accessor in Step 4.
  // Or simpler: Just take the accessToken as a string in this function. But token might expire.
  //
  // Best approach: Pass a function `getAccessToken: () => string`.

  const getAccessToken = () => {
    return client.getAccessTokenOrThrow();
  };

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
        }
      );

      if (!response.ok) {
        // If 401/403, maybe token expired?
        // But we rely on client to handle token refresh?
        // YouTubeClient methods don't auto-refresh on 401 usually unless built-in.
        // The current YouTubeClient throws on error.
        console.warn(`Polling error: ${response.statusText}`);
      } else {
        const data = await response.json();
        const items = data.items || [];

        if (items.length > 0) {
          const item = items[0];
          const processingDetails = item.processingDetails;
          const status = item.status?.uploadStatus;

          // processingDetails.processingStatus can be:
          // "processing", "succeeded", "failed", "terminated"

          if (status === "processed" || processingDetails?.processingStatus === "succeeded") {
            return {
              status: "processed",
              processingDetails,
            };
          }

          if (processingDetails?.processingStatus === "failed" || processingDetails?.processingStatus === "terminated") {
            return {
              status: "failed",
              processingDetails,
            };
          }

          // Still processing
        } else {
            // Video not found yet? (Consistency delay)
        }
      }

    } catch (error) {
      console.error("Polling exception:", error);
    }

    // Wait for interval
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: "timeout" };
}
