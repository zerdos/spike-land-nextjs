"use client";

import { AlbumCard } from "@/components/enhance/AlbumCard";
import { BatchEnhanceProgress } from "@/components/enhance/BatchEnhanceProgress";
import { EnhancementSettings } from "@/components/enhance/EnhancementSettings";
import { ImageComparisonSlider } from "@/components/enhance/ImageComparisonSlider";
import { TierSelectionCheckboxes } from "@/components/enhance/TierSelectionCheckboxes";
import { TokenBalanceDisplay } from "@/components/enhance/TokenBalanceDisplay";
import { Section } from "@/components/storybook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function EnhancePage() {
  // State for interactive examples
  const [selectedTiers, setSelectedTiers] = useState<any[]>(["TIER_1K"]);

  // Mock data
  const mockAlbum = {
    id: "1",
    name: "Vacation 2023",
    privacy: "PRIVATE" as const,
    imageCount: 12,
    previewImages: [
      {
        id: "1",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        name: "Beach",
      },
      {
        id: "2",
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop",
        name: "Mountain",
      },
      {
        id: "3",
        url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
        name: "Forest",
      },
    ],
  };

  const mockBatchImages = [
    {
      imageId: "1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop",
      status: "COMPLETED" as const,
    },
    {
      imageId: "2",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop",
      status: "PROCESSING" as const,
    },
    {
      imageId: "3",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=100&h=100&fit=crop",
      status: "PENDING" as const,
    },
    {
      imageId: "4",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=100&h=100&fit=crop",
      status: "FAILED" as const,
      error: "Processing failed",
    },
  ];

  return (
    <div className="space-y-12">
      <Section
        title="Enhancement Components"
        description="Components for image enhancement workflows"
      >
        {/* ImageComparisonSlider */}
        <Card>
          <CardHeader>
            <CardTitle>Image Comparison Slider</CardTitle>
            <CardDescription>
              Compare original and enhanced images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-2xl">
              <ImageComparisonSlider
                originalUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=60"
                enhancedUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=90&sat=20"
                width={16}
                height={9}
              />
            </div>
          </CardContent>
        </Card>

        {/* EnhancementSettings */}
        <Card>
          <CardHeader>
            <CardTitle>Enhancement Settings</CardTitle>
            <CardDescription>
              Tier selection and cost calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <EnhancementSettings
                onEnhance={async () => {}}
                currentBalance={100}
                isProcessing={false}
                completedVersions={[]}
              />
            </div>
          </CardContent>
        </Card>

        {/* TierSelectionCheckboxes */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Selection Checkboxes</CardTitle>
            <CardDescription>
              Multi-select tiers for batch processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <TierSelectionCheckboxes
                selectedTiers={selectedTiers}
                onSelectionChange={setSelectedTiers}
                userBalance={50}
              />
            </div>
          </CardContent>
        </Card>

        {/* BatchEnhanceProgress */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Enhance Progress</CardTitle>
            <CardDescription>
              Progress tracking for batch operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-3xl">
              <BatchEnhanceProgress
                images={mockBatchImages}
                tier="TIER_2K"
              />
            </div>
          </CardContent>
        </Card>

        {/* AlbumCard */}
        <Card>
          <CardHeader>
            <CardTitle>Album Card</CardTitle>
            <CardDescription>
              Card component for album display
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-64">
              <AlbumCard album={mockAlbum} onClick={() => {}} />
            </div>
          </CardContent>
        </Card>

        {/* TokenBalanceDisplay */}
        <Card>
          <CardHeader>
            <CardTitle>Token Balance Display</CardTitle>
            <CardDescription>
              Display user token balance and stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <TokenBalanceDisplay showAnalytics={true} />
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
