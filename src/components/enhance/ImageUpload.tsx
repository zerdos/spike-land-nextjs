"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ImageUploadProps {
  onFilesSelected?: (files: File[]) => Promise<void>;
  isUploading?: boolean;
}

export function ImageUpload(
  { onFilesSelected, isUploading: externalIsUploading }: ImageUploadProps,
) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);

    if (filesArray.length === 0) return;

    setError(null);

    // If onFilesSelected callback is provided, use it (multi-file mode)
    if (onFilesSelected) {
      try {
        await onFilesSelected(filesArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onFilesSelected]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      await handleFiles(files);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
    },
    [],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (!files) return;
      await handleFiles(files);
    },
    [handleFiles],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isUploading = externalIsUploading ?? false;

  return (
    <Card
      className={`border-2 border-dashed border-border bg-card/50 transition-all duration-200 ${
        isDragging
          ? "border-primary bg-primary/5 shadow-glow-cyan scale-[1.01]"
          : ""
      } ${isUploading ? "animate-pulse-cyan border-primary/50" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-gradient-primary p-5 mb-6 shadow-glow-primary">
          {isUploading
            ? <Loader2 className="h-10 w-10 text-white animate-spin" />
            : <Upload className="h-10 w-10 text-white" />}
        </div>

        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isUploading ? "Uploading..." : "Upload Images"}
        </h3>

        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          Drag and drop or click to browse. Select one or multiple images (up to 20). Supports JPEG,
          PNG, and WebP up to 50MB each.
        </p>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        <Button onClick={handleClick} disabled={isUploading} size="lg">
          <Upload className="mr-2 h-5 w-5" />
          Select Images
        </Button>
      </CardContent>
    </Card>
  );
}
