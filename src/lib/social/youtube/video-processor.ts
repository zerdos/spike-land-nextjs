
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface ProcessingStatusResult {
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

export interface PollOptions {
  maxAttempts?: number;
  intervalMs?: number;
  timeoutMs?: number;
}

/**
 * Poll YouTube API for video processing status
 */
export async function pollVideoProcessingStatus(
  accessToken: string,
  videoId: string,
  options: PollOptions = {}
): Promise<ProcessingStatusResult> {
  const maxAttempts = options.maxAttempts || 60;
  const intervalMs = options.intervalMs || 10000; // 10 seconds
  const timeoutMs = options.timeoutMs || 30 * 60 * 1000; // 30 minutes
  const startTime = Date.now();

  let attempts = 0;

  while (attempts < maxAttempts) {
    if (Date.now() - startTime > timeoutMs) {
      return { status: "timeout" };
    }

    attempts++;

    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE}/videos?part=processingDetails,status&id=${videoId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // If 404, maybe video isn't available yet? Or just error.
        // We'll retry on error just in case of transient issues
        console.warn(`Polling attempt ${attempts} failed: ${response.statusText}`);
      } else {
        const data = await response.json();
        const item = data.items?.[0];

        if (item) {
          const processingDetails = item.processingDetails;

          if (!processingDetails) {
            // If no processing details, it might be already processed or not started?
            // Usually "uploadStatus" in "status" part tells us.
            if (item.status?.uploadStatus === "processed") {
               return { status: "processed" };
            }
          } else {
            const status = processingDetails.processingStatus;

            if (status === "succeeded") {
              return {
                status: "processed",
                processingDetails
              };
            }

            if (status === "failed" || status === "terminated") {
              return {
                status: "failed",
                processingDetails
              };
            }

            // processing
          }
        }
      }
    } catch (error) {
      console.warn(`Polling attempt ${attempts} error:`, error);
    }

    // Wait for interval
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: "timeout" };
}
