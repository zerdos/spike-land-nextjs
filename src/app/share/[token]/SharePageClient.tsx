"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Button } from "@/components/ui/button";
import { Download, Sparkles } from "lucide-react";
import Link from "next/link";

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
}

export function SharePageClient({
  imageName,
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
}: SharePageClientProps) {
  // Use enhanced dimensions if available, otherwise fall back to original
  const displayWidth = enhancedWidth ?? originalWidth;
  const displayHeight = enhancedHeight ?? originalHeight;

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
          {/* Image name */}
          <h1 className="text-lg md:text-xl font-medium text-white/90 mb-4 text-center">
            {imageName}
          </h1>

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
              asChild
            >
              <a href={originalUrl} download={`${imageName}_original`}>
                <Download className="mr-2 h-4 w-4" />
                Download Original
              </a>
            </Button>
            <Button
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              asChild
            >
              <a href={enhancedUrl} download={`${imageName}_enhanced`}>
                <Download className="mr-2 h-4 w-4" />
                Download Enhanced
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
