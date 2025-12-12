"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Status of an individual file upload
 */
export interface FileUploadStatus {
  id: string; // Unique identifier for the file
  file: File;
  status: "pending" | "uploading" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  imageId?: string; // Set on success
  error?: string;
}

/**
 * Configuration options for the multi-file upload hook
 */
export interface UseMultiFileUploadOptions {
  maxFiles?: number; // Default: 20
  maxFileSize?: number; // Default: 50MB
  parallel?: boolean; // Default: false (sequential)
  albumId?: string; // Optional: upload directly to an album
  onUploadComplete?: (results: FileUploadStatus[]) => void;
  onFileComplete?: (imageId: string) => void;
}

/**
 * Return type for the multi-file upload hook
 */
export interface UseMultiFileUploadReturn {
  upload: (files: File[]) => Promise<void>;
  files: FileUploadStatus[];
  isUploading: boolean;
  progress: number; // Overall 0-100
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  cancel: () => void;
  reset: () => void;
}

const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Custom hook for uploading multiple files with progress tracking
 *
 * @param options - Configuration options
 * @returns Upload controls and status
 *
 * @example
 * ```tsx
 * const { upload, files, progress, isUploading } = useMultiFileUpload({
 *   maxFiles: 10,
 *   parallel: true,
 *   onUploadComplete: (results) => console.log('All done!', results)
 * });
 *
 * // Upload files
 * await upload(selectedFiles);
 * ```
 */
export function useMultiFileUpload(
  options: UseMultiFileUploadOptions = {},
): UseMultiFileUploadReturn {
  const {
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    parallel = false,
    albumId,
    onUploadComplete,
    onFileComplete,
  } = options;

  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Generate a unique ID for file tracking
   */
  const generateFileId = useCallback((): string => {
    return crypto.randomUUID();
  }, []);

  /**
   * Update a file's status by its unique ID
   */
  const updateFileById = useCallback(
    (fileId: string, update: Partial<Omit<FileUploadStatus, "id" | "file">>) => {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...update } : f)));
    },
    [],
  );

  /**
   * Validate a single file
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`;
      }

      // Check file size
      if (file.size > maxFileSize) {
        const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
        return `File size exceeds ${maxSizeMB}MB limit`;
      }

      return null;
    },
    [maxFileSize],
  );

  /**
   * Upload a single file
   */
  const uploadSingleFile = useCallback(
    async (fileStatus: FileUploadStatus, signal: AbortSignal): Promise<void> => {
      const fileId = fileStatus.id;

      // Skip files that already failed validation or are cancelled
      if (fileStatus.status === "failed" || fileStatus.status === "cancelled") {
        return;
      }

      try {
        // Update status to uploading using ID-based update
        updateFileById(fileId, { status: "uploading", progress: 0 });

        const formData = new FormData();
        formData.append("file", fileStatus.file);
        if (albumId) {
          formData.append("albumId", albumId);
        }

        const response = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
          signal,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Upload failed");
        }

        const data = await response.json();

        // Update status to completed using ID-based update
        updateFileById(fileId, {
          status: "completed",
          progress: 100,
          imageId: data.imageId,
        });

        // Call onFileComplete callback
        if (onFileComplete && data.imageId) {
          onFileComplete(data.imageId);
        }
      } catch (error) {
        // Don't mark as failed if it was an abort - mark as cancelled instead
        if (error instanceof Error && error.name === "AbortError") {
          updateFileById(fileId, { status: "cancelled" });
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "Upload failed";

        updateFileById(fileId, {
          status: "failed",
          error: errorMessage,
        });
      }
    },
    [albumId, onFileComplete, updateFileById],
  );

  /**
   * Upload all files sequentially
   */
  const uploadSequential = useCallback(
    async (fileStatuses: FileUploadStatus[], signal: AbortSignal) => {
      for (const fileStatus of fileStatuses) {
        if (signal.aborted) break;
        await uploadSingleFile(fileStatus, signal);
      }
    },
    [uploadSingleFile],
  );

  /**
   * Upload all files in parallel
   */
  const uploadParallel = useCallback(
    async (fileStatuses: FileUploadStatus[], signal: AbortSignal) => {
      await Promise.all(
        fileStatuses.map((fileStatus) => uploadSingleFile(fileStatus, signal)),
      );
    },
    [uploadSingleFile],
  );

  /**
   * Main upload function
   */
  const upload = useCallback(
    async (filesToUpload: File[]): Promise<void> => {
      // Validate file count
      if (filesToUpload.length === 0) {
        throw new Error("No files to upload");
      }

      if (filesToUpload.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }

      // Validate all files upfront and assign unique IDs
      const fileStatuses: FileUploadStatus[] = filesToUpload.map((file) => {
        const validationError = validateFile(file);
        return {
          id: generateFileId(),
          file,
          status: validationError ? ("failed" as const) : ("pending" as const),
          progress: 0,
          error: validationError || undefined,
        };
      });

      // Set initial state
      setFiles(fileStatuses);
      setIsUploading(true);

      // Create abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Upload files (sequential or parallel)
        if (parallel) {
          await uploadParallel(fileStatuses, controller.signal);
        } else {
          await uploadSequential(fileStatuses, controller.signal);
        }

        // Call onUploadComplete callback
        setFiles((currentFiles) => {
          if (onUploadComplete) {
            onUploadComplete(currentFiles);
          }
          return currentFiles;
        });
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [
      maxFiles,
      validateFile,
      parallel,
      uploadParallel,
      uploadSequential,
      onUploadComplete,
      generateFileId,
    ],
  );

  /**
   * Cancel all uploads
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Mark all in-progress and pending files as cancelled
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "uploading" || f.status === "pending"
          ? { ...f, status: "cancelled" as const }
          : f
      )
    );
    setIsUploading(false);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    cancel();
    setFiles([]);
  }, [cancel]);

  /**
   * Calculate overall progress (0-100)
   */
  const progress = files.length === 0
    ? 0
    : Math.round(
      files.reduce((sum, f) => {
        if (f.status === "completed") return sum + 100;
        if (f.status === "failed") return sum + 100;
        if (f.status === "cancelled") return sum + 100; // Treat cancelled as complete for progress
        return sum + f.progress;
      }, 0) / files.length,
    );

  /**
   * Count completed files
   */
  const completedCount = files.filter((f) => f.status === "completed").length;

  /**
   * Count failed files
   */
  const failedCount = files.filter((f) => f.status === "failed").length;

  /**
   * Count cancelled files
   */
  const cancelledCount = files.filter((f) => f.status === "cancelled").length;

  return {
    upload,
    files,
    isUploading,
    progress,
    completedCount,
    failedCount,
    cancelledCount,
    cancel,
    reset,
  };
}
