
/**
 * YouTube Resumable Uploader
 *
 * Implements the YouTube Resumable Upload Protocol
 * Reference: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */

interface InitiateUploadOptions {
  fileSize: number;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: "public" | "private" | "unlisted";
  publishAt?: string;
}

interface UploadChunkResult {
  status: "uploading" | "complete";
  videoId?: string;
}

interface ResumeUploadResult {
  uploadedBytes: number;
}

export class YouTubeResumableUploader {
  /**
   * Initiate a resumable upload session
   *
   * @param accessToken - Google OAuth access token
   * @param options - Video metadata and file size
   * @returns The upload URL provided by Google
   */
  async initiate(
    accessToken: string,
    options: InitiateUploadOptions
  ): Promise<{ uploadUrl: string; sessionId: string }> {
    const metadata = {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || "22", // Default to "People & Blogs"
      },
      status: {
        privacyStatus: options.publishAt ? "private" : options.privacyStatus,
        publishAt: options.publishAt,
      },
    };

    const response = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Length": options.fileSize.toString(),
          "X-Upload-Content-Type": "video/*",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Ignore JSON parse error
      }
      throw new Error(`Failed to initiate upload: ${errorMessage}`);
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("YouTube API did not return an upload URL");
    }

    // Extract session ID from upload URL for tracking
    // URL format: https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=...
    const url = new URL(uploadUrl);
    const sessionId = url.searchParams.get("upload_id");

    if (!sessionId) {
      throw new Error("Could not extract session ID from upload URL");
    }

    return { uploadUrl, sessionId };
  }

  /**
   * Upload a chunk of the file
   *
   * @param uploadUrl - The upload URL obtained from initiate()
   * @param chunk - The buffer containing the chunk data
   * @param start - The starting byte offset of this chunk
   * @param total - The total file size
   */
  async uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    start: number,
    total: number
  ): Promise<UploadChunkResult> {
    const end = start + chunk.length - 1;
    const contentRange = `bytes ${start}-${end}/${total}`;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.length.toString(),
        "Content-Range": contentRange,
        "Content-Type": "application/octet-stream",
      },
      body: chunk,
    });

    if (response.status === 308) {
      // 308 Resume Incomplete means the chunk was accepted but upload is not finished
      return { status: "uploading" };
    } else if (response.ok) {
      // 200/201 means upload completed
      const data = await response.json();
      return {
        status: "complete",
        videoId: data.id
      };
    } else {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Ignore parse error
      }
      throw new Error(`Failed to upload chunk: ${errorMessage}`);
    }
  }

  /**
   * Check the status of an upload session to resume it
   *
   * @param uploadUrl - The upload URL
   * @returns The number of bytes already uploaded
   */
  async resumeUpload(uploadUrl: string): Promise<ResumeUploadResult> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": "bytes */*",
      },
    });

    if (response.status === 308) {
      const rangeHeader = response.headers.get("Range");
      if (rangeHeader) {
        // Range header format: bytes=0-12345
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          return { uploadedBytes: parseInt(match[1], 10) + 1 };
        }
      }
      // If no Range header, it means 0 bytes uploaded
      return { uploadedBytes: 0 };
    } else if (response.ok) {
      // If 200/201, it means the file is already fully uploaded
      // This is an edge case where we try to resume a completed upload
      // We can't easily get the file size here, so we might need to handle this upstream
      // For now, let's assume if it's done, we treat it as max (but we don't know max here)
      // Throwing for now as the caller should probably have known, or we return -1 to indicate complete
      throw new Error("Upload is already complete");
    } else {
       // If 404, the upload session has expired
       if (response.status === 404) {
         throw new Error("Upload session expired");
       }

       const errorText = await response.text();
       throw new Error(`Failed to check upload status: ${response.statusText} ${errorText}`);
    }
  }
}
