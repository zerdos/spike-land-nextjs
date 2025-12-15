"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface SharePageClientProps {
  imageName: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl: string;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number | null;
  enhancedHeight: number | null;
  tier: string;
  shareToken: string;
}

const tierLabels: Record<string, string> = {
  TIER_1K: "1K",
  TIER_2K: "2K",
  TIER_4K: "4K",
};

export function SharePageClient({
  imageName,
  description,
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
  tier,
  shareToken,
}: SharePageClientProps) {
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [downloadingEnhanced, setDownloadingEnhanced] = useState(false);

  // Use enhanced dimensions if available, otherwise fall back to original
  const displayWidth = enhancedWidth ?? originalWidth;
  const displayHeight = enhancedHeight ?? originalHeight;

  const tierLabel = tierLabels[tier] || tier.replace("TIER_", "");

  const handleDownload = async (type: "original" | "enhanced") => {
    const setLoading = type === "original"
      ? setDownloadingOriginal
      : setDownloadingEnhanced;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/share/${shareToken}/download?type=${type}`,
      );

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${imageName}_${type}.jpg`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xl font-bold text-white hover:opacity-80 transition-opacity"
        >
          <Sparkles className="h-6 w-6 text-cyan-400" />
          <span>pixel</span>
        </Link>
      </header>

      {/* Main - centered image comparison */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div
          className="w-full"
          style={{
            maxWidth: `min(${displayWidth}px, 90vw)`,
          }}
        >
          {/* Image name with tier badge */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-lg md:text-xl font-medium text-white/90">
              {imageName}
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
              {tierLabel}
            </span>
          </div>

          {/* Optional description */}
          {description && (
            <p className="text-sm text-white/60 text-center mb-4">
              {description}
            </p>
          )}

          {/* Comparison slider */}
          <div className="rounded-lg overflow-hidden">
            <ImageComparisonSlider
              originalUrl={originalUrl}
              enhancedUrl={enhancedUrl}
              originalLabel="Before"
              enhancedLabel="After"
              width={displayWidth}
              height={displayHeight}
            />
          </div>

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            <Button
              variant="outline"
              size="lg"
              className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={() => handleDownload("original")}
              disabled={downloadingOriginal}
            >
              {downloadingOriginal
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              Download Original
            </Button>
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => handleDownload("enhanced")}
              disabled={downloadingEnhanced}
            >
              {downloadingEnhanced
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              Download Enhanced
            </Button>
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="p-4 md:p-6 text-center">
        <Link
          href="/"
          className="text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          Enhanced with Pixel
        </Link>
      </footer>
    </div>
  );
}
