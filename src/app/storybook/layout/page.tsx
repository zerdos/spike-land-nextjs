"use client";

import { Section } from "@/components/storybook";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MasonryGrid, MasonryGridUniform, type ZoomLevel } from "@/components/ui/masonry-grid";
import { Separator } from "@/components/ui/separator";
import { TextOverlay } from "@/components/ui/text-overlay";
import { ZoomSlider } from "@/components/ui/zoom-slider";
import Image from "next/image";
import { useState } from "react";

// Sample items with varying heights for masonry demo
const masonryItems = [
  {
    id: 1,
    height: "h-48",
    color: "bg-gradient-to-br from-cyan-500/20 to-blue-500/20",
  },
  {
    id: 2,
    height: "h-32",
    color: "bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20",
  },
  {
    id: 3,
    height: "h-56",
    color: "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
  },
  {
    id: 4,
    height: "h-40",
    color: "bg-gradient-to-br from-emerald-500/20 to-green-500/20",
  },
  {
    id: 5,
    height: "h-48",
    color: "bg-gradient-to-br from-violet-500/20 to-purple-500/20",
  },
  {
    id: 6,
    height: "h-36",
    color: "bg-gradient-to-br from-rose-500/20 to-red-500/20",
  },
];

// Sample images for text overlay demo
const overlayImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    alt: "Mountain landscape",
    label: "Enhanced",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
    alt: "Nature scene",
    label: "Original",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    alt: "Forest path",
    label: "Pro Tier",
  },
];

export default function LayoutPage() {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(3);

  return (
    <div className="space-y-12">
      <Section
        title="Layout Components"
        description="Components for organizing and displaying content"
      >
        {/* Masonry Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Masonry Grid</CardTitle>
            <CardDescription>
              CSS columns-based masonry layout for items with varying heights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Zoom Level: {zoomLevel}
              </Label>
              <ZoomSlider value={zoomLevel} onChange={setZoomLevel} />
            </div>
            <MasonryGrid zoomLevel={zoomLevel}>
              {masonryItems.map((item) => (
                <div
                  key={item.id}
                  className={`${item.height} ${item.color} rounded-lg border border-border flex items-center justify-center`}
                >
                  <span className="text-sm text-muted-foreground">
                    Item {item.id}
                  </span>
                </div>
              ))}
            </MasonryGrid>
          </CardContent>
        </Card>

        {/* Masonry Grid Uniform */}
        <Card>
          <CardHeader>
            <CardTitle>Masonry Grid Uniform</CardTitle>
            <CardDescription>
              Grid-based variant for items with uniform aspect ratios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MasonryGridUniform zoomLevel={3}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-border flex items-center justify-center"
                >
                  <span className="text-sm text-muted-foreground">
                    Square {item}
                  </span>
                </div>
              ))}
            </MasonryGridUniform>
          </CardContent>
        </Card>

        <Separator />

        {/* Text Overlay */}
        <Card>
          <CardHeader>
            <CardTitle>Text Overlay</CardTitle>
            <CardDescription>
              Position text labels on top of images with gradient backing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Position Variants
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overlayImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative rounded-lg overflow-hidden"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover"
                    />
                    <TextOverlay position="bottom-left">
                      {image.label}
                    </TextOverlay>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                All Position Options
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/30" />
                  <TextOverlay position="top-left">Top Left</TextOverlay>
                </div>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 to-orange-500/30" />
                  <TextOverlay position="top-right">Top Right</TextOverlay>
                </div>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-green-500/30" />
                  <TextOverlay position="center">Center</TextOverlay>
                </div>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-purple-500/30" />
                  <TextOverlay position="bottom-left">Bottom Left</TextOverlay>
                </div>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 to-red-500/30" />
                  <TextOverlay position="bottom-right">
                    Bottom Right
                  </TextOverlay>
                </div>
                <div className="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30" />
                  <TextOverlay
                    position="bottom-left"
                    gradient={false}
                    className="bg-primary text-primary-foreground"
                  >
                    No Gradient
                  </TextOverlay>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Zoom Slider */}
        <Card>
          <CardHeader>
            <CardTitle>Zoom Slider</CardTitle>
            <CardDescription>
              Control zoom level for masonry grids with localStorage persistence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                Default Zoom Slider
              </Label>
              <div className="flex items-center gap-4">
                <ZoomSlider />
                <Badge variant="outline">Persists to localStorage</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground">
                Controlled Zoom Slider
              </Label>
              <div className="flex items-center gap-4">
                <ZoomSlider value={zoomLevel} onChange={setZoomLevel} />
                <Badge variant="secondary">Level: {zoomLevel}</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Zoom State Synchronization
                </Label>
                <span className="text-[10px] text-muted-foreground/70">
                  Slider and buttons stay in sync
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {([1, 2, 3, 4, 5] as ZoomLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={`p-4 rounded-lg border text-center transition-colors ${
                      zoomLevel === level
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl font-bold">{level}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {level === 1
                        ? "Smallest"
                        : level === 5
                        ? "Largest"
                        : `Level ${level}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
