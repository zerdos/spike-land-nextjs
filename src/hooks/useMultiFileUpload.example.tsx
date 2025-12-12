/**
 * Example usage of useMultiFileUpload hook
 *
 * This file demonstrates various ways to use the multi-file upload hook.
 * DO NOT import this file in your application - it's for reference only.
 */

import { useMultiFileUpload } from "./useMultiFileUpload";

/**
 * Example 1: Basic Sequential Upload
 */
export function BasicUploadExample() {
  const { upload, files, isUploading, progress } = useMultiFileUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await upload(selectedFiles);
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileSelect} disabled={isUploading} />
      {isUploading && <p>Uploading... {progress}%</p>}
      <ul>
        {files.map((file, index) => (
          <li key={index}>
            {file.file.name} - {file.status} ({file.progress}%)
            {file.error && <span>Error: {file.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 2: Parallel Upload with Callbacks
 */
export function ParallelUploadExample() {
  const { upload, completedCount, failedCount, isUploading } = useMultiFileUpload({
    parallel: true,
    maxFiles: 10,
    onFileComplete: (imageId) => {
      console.log("File uploaded:", imageId);
    },
    onUploadComplete: (results) => {
      const successful = results.filter((r) => r.status === "completed");
      const failed = results.filter((r) => r.status === "failed");
      console.log(`Upload complete! ${successful.length} succeeded, ${failed.length} failed`);
    },
  });

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    await upload(droppedFiles);
  };

  return (
    <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <p>Drop files here</p>
      {isUploading && <p>Uploading files...</p>}
      <p>Completed: {completedCount} | Failed: {failedCount}</p>
    </div>
  );
}

/**
 * Example 3: Upload with Cancellation
 */
export function CancellableUploadExample() {
  const { upload, cancel, reset, files, isUploading } = useMultiFileUpload({
    parallel: false,
    maxFiles: 20,
  });

  const handleUpload = async (selectedFiles: File[]) => {
    try {
      await upload(selectedFiles);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div>
      <button onClick={() => handleUpload([])} disabled={isUploading}>
        Start Upload
      </button>
      <button onClick={cancel} disabled={!isUploading}>
        Cancel
      </button>
      <button onClick={reset}>Reset</button>

      <div>
        {files.map((file, index) => (
          <div key={index}>
            <span>{file.file.name}</span>
            <span>{file.status}</span>
            {file.status === "uploading" && <progress value={file.progress} max={100} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 4: Custom Validation (Size and Type)
 */
export function CustomValidationExample() {
  const { upload, files } = useMultiFileUpload({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    // Additional custom validation can be done here before upload
    const validFiles = selectedFiles.filter((file) => {
      // Example: Only allow JPEG files
      return file.type === "image/jpeg";
    });

    if (validFiles.length !== selectedFiles.length) {
      alert("Some files were skipped (only JPEG files allowed)");
    }

    await upload(validFiles);
  };

  return (
    <div>
      <input type="file" multiple accept="image/jpeg" onChange={handleFileSelect} />
      <ul>
        {files.map((file, index) => (
          <li key={index} style={{ color: file.status === "failed" ? "red" : "black" }}>
            {file.file.name} - {file.status}
            {file.error && <div>Error: {file.error}</div>}
            {file.imageId && <div>Image ID: {file.imageId}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example 5: Integration with Album System
 */
export function AlbumUploadExample() {
  const { upload: _upload, files: _files, completedCount, reset } = useMultiFileUpload({
    parallel: true,
    onFileComplete: (imageId) => {
      // Add image to album
      console.log("Adding image to album:", imageId);
    },
    onUploadComplete: (results) => {
      const imageIds = results
        .filter((r) => r.status === "completed" && r.imageId)
        .map((r) => r.imageId!);

      // Batch add all images to album
      console.log("Batch adding images to album:", imageIds);
      reset(); // Clear the upload state
    },
  });

  return (
    <div>
      <p>Upload images to album</p>
      <p>{completedCount} images uploaded</p>
      {/* File selection UI */}
    </div>
  );
}
