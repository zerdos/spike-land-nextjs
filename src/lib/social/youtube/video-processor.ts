
/**
 * YouTube Video Processing Status Poller
 */

interface ProcessingDetails {
  processingStatus: string;
  processingProgress?: {
    partsProcessed: number;
    partsTotal: number;
    timeLeftMs: number;
  };
  processingFailureReason?: string;
}

interface VideoStatusResponse {
  items?: Array<{
    status?: {
      uploadStatus?: string;
      rejectionReason?: string;
      failureReason?: string;
    };
    processingDetails?: ProcessingDetails;
  }>;
}

/**
 * Polls the status of a YouTube video until it is processed, fails, or times out.
 *
 * @param accessToken - Valid OAuth2 access token
 * @param videoId - ID of the video to check
 * @param options - Polling configuration
 */
export async function pollVideoProcessingStatus(
  accessToken: string,
  videoId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<{
  status: "processed" | "processing" | "failed" | "timeout";
  processingDetails?: ProcessingDetails;
}> {
  const maxAttempts = options.maxAttempts || 60;
  const intervalMs = options.intervalMs || 5000;
  const timeoutMs = options.timeoutMs || maxAttempts * intervalMs;

  const startTime = Date.now();
  let attempts = 0;

  while (attempts < maxAttempts && (Date.now() - startTime) < timeoutMs) {
    attempts++;

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=processingDetails,status&id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
           throw new Error(`Access denied: ${response.statusText}`);
        }
        // Retry on other errors
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const data = (await response.json()) as VideoStatusResponse;
      const video = data.items?.[0];

      if (!video) {
        // Video not found yet? Wait and retry
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const processingDetails = video.processingDetails;
      const uploadStatus = video.status?.uploadStatus;

      // Check for success
      if (uploadStatus === 'processed' || processingDetails?.processingStatus === 'succeeded') {
        return { status: "processed", processingDetails };
      }

      // Check for failure
      if (
        uploadStatus === 'failed' ||
        uploadStatus === 'rejected' ||
        processingDetails?.processingStatus === 'failed' ||
        processingDetails?.processingStatus === 'terminated'
      ) {
        return { status: "failed", processingDetails };
      }

      // Still processing or uploaded (waiting for processing)
      // Wait for interval
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes("Access denied")) {
        throw error;
      }
      // Retry on network errors
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
  }

  // If we exit loop, we timed out
  return { status: "timeout" };
}
