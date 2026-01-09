"use client";

import { ImageSlot, type SelectedImage } from "@/components/mix/ImageSlot";
import { MixShareQRCode } from "@/components/mix/MixShareQRCode";
import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Download, Layers, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample gallery image for demonstration
const sampleGalleryImage: SelectedImage = {
  type: "gallery",
  id: "sample-1",
  url: "https://placehold.co/400x400/1a1a2e/ffffff.png?text=Sample",
  name: "sample-photo.jpg",
  width: 400,
  height: 400,
};

const sampleUploadImage: SelectedImage = {
  type: "upload",
  id: "upload-1",
  url: "https://placehold.co/400x400/2e1a2e/ffffff.png?text=Uploaded",
  name: "my-upload.png",
  width: 400,
  height: 400,
  base64: "",
  mimeType: "image/png",
};

// Tier styles for MixHistory preview
const tierStyles: Record<string, string> = {
  TIER_1K: "bg-green-500/20 text-green-400 border-green-500/30",
  TIER_2K: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TIER_4K: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function PhotoMixPage() {
  const [slotImage1, setSlotImage1] = useState<SelectedImage | null>(null);
  const [slotImage2, setSlotImage2] = useState<SelectedImage | null>(
    sampleGalleryImage,
  );
  const [slotImage3, setSlotImage3] = useState<SelectedImage | null>(
    sampleUploadImage,
  );

  return (
    <div className="space-y-12">
      <Section
        title="PhotoMix Components"
        description="Photo mixing and blending components for creating AI-powered image combinations"
      >
        {/* ImageSlot */}
        <Card>
          <CardHeader>
            <CardTitle>Image Slot</CardTitle>
            <CardDescription>
              Drag & drop image slots with gallery selection and upload support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Empty State
                </p>
                <ImageSlot
                  label="Photo 1"
                  image={slotImage1}
                  onImageSelect={(img) => setSlotImage1(img)}
                  onImageClear={() => setSlotImage1(null)}
                  onOpenGallery={() => {}}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  With Gallery Image
                </p>
                <ImageSlot
                  label="Photo 2"
                  image={slotImage2}
                  onImageSelect={(img) => setSlotImage2(img)}
                  onImageClear={() => setSlotImage2(null)}
                  onOpenGallery={() => {}}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  With Uploaded Image
                </p>
                <ImageSlot
                  label="Photo 3"
                  image={slotImage3}
                  onImageSelect={(img) => setSlotImage3(img)}
                  onImageClear={() => setSlotImage3(null)}
                  onOpenGallery={() => {}}
                />
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">
                Disabled State
              </p>
              <div className="w-64">
                <ImageSlot
                  label="Disabled Slot"
                  image={null}
                  onImageSelect={() => {}}
                  onImageClear={() => {}}
                  onOpenGallery={() => {}}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MixResultCard States */}
        <Card>
          <CardHeader>
            <CardTitle>Mix Result Card</CardTitle>
            <CardDescription>
              Result display with multiple states: empty, processing, completed, failed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Empty - No Images */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Empty (no images)
                </p>
                <Card className="relative overflow-hidden aspect-square">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <Layers className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Select two images
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Choose input photos to start
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Empty - Ready */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ready to mix</p>
                <Card className="relative overflow-hidden aspect-square">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                      <Layers className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Ready to mix
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Click &apos;Create Mix&apos; to blend images
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Processing */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Processing</p>
                <Card className="relative overflow-hidden aspect-square">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="text-sm font-medium">Mixing...</p>
                      <p className="text-xs text-muted-foreground">
                        Blending images
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Failed */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Failed</p>
                <Card className="relative overflow-hidden aspect-square">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        Mix failed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Something went wrong
                      </p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Completed State */}
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-2">Completed</p>
              <div className="w-64">
                <Card className="relative overflow-hidden aspect-square bg-gradient-to-br from-primary/20 to-secondary/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">🎨</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                    <Button size="sm" variant="secondary" className="w-full">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MixHistory */}
        <Card>
          <CardHeader>
            <CardTitle>Mix History</CardTitle>
            <CardDescription>
              Horizontal scrollable gallery of past mixes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loading State */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Loading State
              </p>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">History</h3>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Empty State</p>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">History</h3>
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No mixes yet. Create your first mix above.
                  </p>
                </div>
              </div>
            </div>

            {/* With Items */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                With History Items
              </p>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">History</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[
                    { tier: "TIER_1K", date: "Dec 15" },
                    { tier: "TIER_2K", date: "Dec 14" },
                    { tier: "TIER_4K", date: "Dec 13" },
                  ].map((mix, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex-shrink-0 rounded-lg overflow-hidden border border-border hover:border-primary transition-all bg-card"
                    >
                      <div className="flex items-center gap-1 p-2">
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <span className="text-xs">📷</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <span className="text-xs">📷</span>
                        </div>
                        <span className="text-muted-foreground mx-1">=</span>
                        <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <span className="text-xs">🎨</span>
                        </div>
                      </div>
                      <div className="px-2 pb-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {mix.date}
                        </span>
                        <Badge
                          variant="outline"
                          className={tierStyles[mix.tier]}
                        >
                          {mix.tier.replace("TIER_", "")}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MixShareQRCode */}
        <Card>
          <CardHeader>
            <CardTitle>Mix Share QR Code</CardTitle>
            <CardDescription>
              QR code widget for sharing mixes (fixed position on desktop)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expanded State */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Expanded State
                </p>
                <div className="inline-block">
                  <MixShareQRCode
                    shareUrl="https://spike.land/mix/example-123"
                    className="!static !block"
                  />
                </div>
              </div>

              {/* Note about component */}
              <div className="flex items-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    The QR code component is fixed to the bottom-right corner on desktop and hidden
                    on mobile. It can be collapsed to show only an icon button.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ImageSelectorDialog Note */}
        <Card>
          <CardHeader>
            <CardTitle>Image Selector Dialog</CardTitle>
            <CardDescription>
              Modal dialog for selecting images from the user&apos;s gallery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                The Image Selector Dialog requires API access to display user images.
              </p>
              <p className="text-sm mt-2">
                Visit the{" "}
                <Link
                  href="/apps/pixel/mix"
                  className="text-primary hover:underline"
                >
                  PhotoMix App
                </Link>{" "}
                to see it in action.
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
