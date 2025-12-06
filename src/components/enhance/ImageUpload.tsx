"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function ImageUpload() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();

      // Redirect to enhancement page
      router.push(`/enhance/${data.image.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [router]);

  return (
    <Card className="border-dashed border-border bg-card/50">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-gradient-primary p-5 mb-6 shadow-glow-primary">
          {isUploading
            ? <Loader2 className="h-10 w-10 text-white animate-spin" />
            : <Upload className="h-10 w-10 text-white" />}
        </div>

        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isUploading ? "Uploading..." : "Upload an Image"}
        </h3>

        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          Drag and drop or click to browse. Supports JPEG, PNG, and WebP up to 50MB.
        </p>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        <Button asChild disabled={isUploading} size="lg">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mr-2 h-5 w-5" />
            Select Image
          </label>
        </Button>
      </CardContent>
    </Card>
  );
}
