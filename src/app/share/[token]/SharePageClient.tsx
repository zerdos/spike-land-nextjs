"use client";

import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

interface SharePageClientProps {
  imageName: string;
  description: string | null;
  originalUrl: string;
  enhancedUrl: string;
  originalWidth: number;
  originalHeight: number;
}

export function SharePageClient({
  imageName,
  description,
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
}: SharePageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            Pixel
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          {/* Image Title */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {imageName}
            </h1>
            {description && <p className="mt-2 text-muted-foreground">{description}</p>}
            <p className="mt-2 text-sm text-muted-foreground">
              Enhanced with <span className="font-medium text-primary">Pixel</span>{" "}
              - AI Image Enhancement
            </p>
          </div>

          {/* Comparison Slider */}
          <div className="rounded-xl border border-border/50 bg-card p-2 shadow-lg md:p-4">
            <ImageComparisonSlider
              originalUrl={originalUrl}
              enhancedUrl={enhancedUrl}
              originalLabel="Before"
              enhancedLabel="After"
              width={originalWidth}
              height={originalHeight}
            />
          </div>

          {/* CTA Section */}
          <div className="mt-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Want to enhance your own photos with AI?
            </p>
            <Button asChild size="lg" className="font-semibold">
              <Link href="/">
                <Sparkles className="mr-2 h-5 w-5" />
                Enhance Your Photos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Made with{" "}
            <Link
              href="/"
              className="font-medium text-primary hover:underline"
            >
              Pixel
            </Link>{" "}
            - AI Image Enhancement
          </p>
        </div>
      </footer>
    </div>
  );
}
