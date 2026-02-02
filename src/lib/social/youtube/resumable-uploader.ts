
import { SocialApiError } from "../types";

export interface UploadInitiateOptions {
  file: File | Buffer;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: "public" | "private" | "unlisted";
  publishAt?: string; // ISO 8601 string for scheduled publishing
}

export interface UploadChunkResult {
  status: "uploading" | "complete";
  videoId?: string;
  bytesUploaded?: number;
}

export class YouTubeResumableUploader {
  private static readonly UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";

  /**
   * Initiate a resumable upload session
   */
  async initiate(
    accessToken: string,
    options: UploadInitiateOptions
  ): Promise<{ uploadUrl: string; sessionId: string }> {
    const metadata = {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || "22", // Default to People & Blogs
      },
      status: {
        privacyStatus: options.privacyStatus,
        publishAt: options.publishAt,
      },
    };

    const response = await fetch(YouTubeResumableUploader.UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": this.getFileSize(options.file).toString(),
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to initiate upload: ${error.error?.message || response.statusText}`
      );
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("YouTube API did not return an upload location");
    }

    // Extract session ID from URL if possible, or use the whole URL as identifier
    const urlObj = new URL(uploadUrl);
    const sessionId = urlObj.searchParams.get("upload_id") || "unknown";

    return { uploadUrl, sessionId };
  }

  /**
   * Upload a chunk of data
   */
  async uploadChunk(
    uploadUrl: string,
    chunk: Buffer,
    start: number,
    totalSize: number
  ): Promise<UploadChunkResult> {
    const end = start + chunk.length - 1;
    const contentRange = `bytes ${start}-${end}/${totalSize}`;

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.length.toString(),
        "Content-Range": contentRange,
        "Content-Type": "application/octet-stream",
      },
      body: chunk,
    });

    // 308 Resume Incomplete means the chunk was accepted but upload is not finished
    if (response.status === 308) {
      return { status: "uploading", bytesUploaded: end + 1 };
    }

    // 200 or 201 Created means upload is complete
    if (response.ok) {
      const data = await response.json();
      return { status: "complete", videoId: data.id };
    }

    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Chunk upload failed: ${error.error?.message || response.statusText}`
    );
  }

  /**
   * Check upload status to resume
   */
  async resumeUpload(
    uploadUrl: string
  ): Promise<{ uploadedBytes: number }> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Range": "bytes */*",
      },
    });

    if (response.status === 308) {
      const range = response.headers.get("Range");
      if (range) {
        // Range header is like "bytes=0-12345"
        const match = range.match(/bytes=0-(\d+)/);
        if (match && match[1]) {
          return { uploadedBytes: parseInt(match[1], 10) + 1 };
        }
      }
      return { uploadedBytes: 0 };
    }

    if (response.ok) {
      // Upload is already complete
      return { uploadedBytes: -1 }; // Indicator for complete
    }

    throw new Error(`Failed to check upload status: ${response.statusText}`);
  }

  private getFileSize(file: File | Buffer): number {
    if (Buffer.isBuffer(file)) {
      return file.length;
    }
    return file.size;
  }
}
