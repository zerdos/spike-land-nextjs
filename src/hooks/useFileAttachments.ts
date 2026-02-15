import { useCallback, useRef, useState } from "react";
import type { PendingFile, PendingImage } from "@/lib/apps/types";

export function useFileAttachments(appId: string | undefined) {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newFiles: PendingFile[] = [];
      for (let i = 0; i < Math.min(files.length, 10); i++) {
        const file = files[i];
        if (file && !file.type.startsWith("image/")) {
          newFiles.push({ id: `pending-${Date.now()}-${i}`, file });
        }
      }
      setPendingFiles((prev) => [...prev, ...newFiles].slice(0, 10));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [],
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newImages: PendingImage[] = [];
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        if (file && file.type.startsWith("image/")) {
          newImages.push({
            id: `pending-${Date.now()}-${i}`,
            file,
            previewUrl: URL.createObjectURL(file),
          });
        }
      }
      setPendingImages((prev) => [...prev, ...newImages].slice(0, 5));
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    },
    [],
  );

  const handleRemoveFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleRemoveImage = useCallback((id: string) => {
    setPendingImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (pendingImages.length === 0 || !appId) return [];

    setUploadingImages(true);
    try {
      const formData = new FormData();
      pendingImages.forEach((img) => {
        formData.append("images", img.file);
      });

      const response = await fetch(`/api/apps/${appId}/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload images");

      const data = await response.json();
      return data.images.map((img: { id: string }) => img.id);
    } finally {
      setUploadingImages(false);
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
    }
  }, [appId, pendingImages]);

  return {
    pendingImages,
    pendingFiles,
    setPendingFiles,
    uploadingImages,
    handleFileSelect,
    handleImageSelect,
    handleRemoveFile,
    handleRemoveImage,
    uploadImages,
    fileInputRef,
    imageInputRef,
  };
}
