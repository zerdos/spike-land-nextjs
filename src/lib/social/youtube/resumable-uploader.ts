/**
 * YouTube Resumable Upload Utility
 *
 * Handles the complexities of YouTube's resumable upload protocol:
 * 1. Initiate session
 * 2. Upload chunks with retry logic
 * 3. Handle interruptions and resume
 *
 * API Reference: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */

const RESUMABLE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

export interface VideoMetadata {
  file?: Buffer;
  fileSize?: number;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: "public" | "private" | "unlisted";
  publishAt?: string; // ISO 8601 date string
}

export interface UploadInitiateResult {
  uploadUrl: string;
  sessionId: string; // Extracted from uploadUrl
}

export interface ChunkUploadResult {
  status: "uploading" | "complete";
  videoId?: string;
  uploadedBytes?: number;
}

export class YouTubeResumableUploader {
  /**
   * Initiate a resumable upload session
   *
   * @param accessToken - Valid OAuth 2.0 access token
   * @param metadata - Video metadata
   * @returns Upload URL and session ID
   */
  async initiate(
    accessToken: string,
    metadata: VideoMetadata,
  ): Promise<UploadInitiateResult> {
    let fileSize = metadata.fileSize;

    if (fileSize === undefined) {
      if (!metadata.file) {
        throw new Error("Either file or fileSize must be provided");
      }
      fileSize = metadata.file.length;
    }

    const body = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
      },
      status: {
        privacyStatus: metadata.publishAt ? "private" : metadata.privacyStatus,
        publishAt: metadata.publishAt,
      },
    };

    const response = await fetch(RESUMABLE_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": fileSize.toString(),
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initiate upload: ${response.statusText} - ${errorText}`);
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("YouTube API did not return an upload URL");
    }

    // Extract session ID from URL query params
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
   * @param uploadUrl - The unique upload URL obtained from initiate()
   * @param chunk - Buffer containing the chunk data
   * @param start - Byte offset start
   * @param total - Total file size
   * @returns Upload status
   */
  async uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    start: number,
    total: number,
  ): Promise<ChunkUploadResult> {
    const end = start + chunk.length - 1;
    const contentRange = `bytes ${start}-${end}/${total}`;

    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": chunk.length.toString(),
          "Content-Range": contentRange,
          "Content-Type": "application/octet-stream",
        },
        // Force cast for fetch compatibility in diverse environments (Node/Browser)
        // @ts-expect-error - Buffer is accepted by node-fetch/Next.js fetch but Typescript DOM lib complains
        body: chunk,
      });

      // 308 Resume Incomplete - Chunk uploaded successfully, continue
      if (response.status === 308) {
        return { status: "uploading", uploadedBytes: end + 1 };
      }

      // 200 OK or 201 Created - Upload complete
      if (response.status === 200 || response.status === 201) {
        const data = await response.json();
        return { status: "complete", videoId: data.id };
      }

      // Other errors
      const errorText = await response.text();
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    } catch (error) {
      // Network error or other fetch issue
      // Caller should handle retry logic (e.g., call resumeUpload)
      throw error;
    }
  }

  /**
   * Check upload status and resume
   * Used to recover from network interruptions
   *
   * @param uploadUrl - The upload URL
   * @param totalSize - Total size of the file
   * @returns Number of bytes already uploaded
   */
  async resumeUpload(
    uploadUrl: string,
    totalSize: number,
  ): Promise<{ uploadedBytes: number; }> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes */${totalSize}`,
      },
    });

    if (response.status === 308) {
      const range = response.headers.get("Range");
      if (range) {
        // Range header format: "bytes=0-99999"
        const match = range.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          return { uploadedBytes: parseInt(match[1], 10) + 1 };
        }
      }
      // If no Range header, nothing uploaded yet
      return { uploadedBytes: 0 };
    }

    if (response.status === 200 || response.status === 201) {
      // Already completed
      return { uploadedBytes: totalSize };
    }

    // If 404, upload session expired
    if (response.status === 404) {
      throw new Error("Upload session expired or invalid");
    }

    const errorText = await response.text();
    throw new Error(`Failed to check upload status: ${response.status} - ${errorText}`);
  }
}
